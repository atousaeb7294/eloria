import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const CUSTOMER_SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-eloria_customer_session" : "eloria_customer_session";
const DEFAULT_SESSION_DAYS = 30;
const DEFAULT_OTP_MINUTES = 5;

function authSecret(): string {
  const explicit = process.env.ELORIA_CUSTOMER_AUTH_SECRET?.trim();
  if (explicit && explicit.length >= 48) return explicit;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ELORIA_CUSTOMER_AUTH_SECRET باید در Production حداقل ۴۸ کاراکتر باشد.");
  }
  return process.env.ELORIA_ADMIN_SESSION_SECRET?.trim() || "eloria-development-customer-auth-secret-not-for-production";
}

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(process.env[name]?.trim() ?? "", 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

export function customerSessionDays(): number {
  return intEnv("ELORIA_CUSTOMER_SESSION_DAYS", DEFAULT_SESSION_DAYS, 1, 90);
}

export function customerOtpMinutes(): number {
  return intEnv("ELORIA_CUSTOMER_OTP_TTL_MINUTES", DEFAULT_OTP_MINUTES, 2, 15);
}

export function normalizeIranMobile(value: string): string {
  const translated = value
    .trim()
    .replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .replace(/[\s()-]/g, "");

  let mobile = translated;
  if (mobile.startsWith("+98")) mobile = `0${mobile.slice(3)}`;
  else if (mobile.startsWith("0098")) mobile = `0${mobile.slice(4)}`;
  else if (mobile.startsWith("98") && mobile.length === 12) mobile = `0${mobile.slice(2)}`;

  if (!/^09\d{9}$/.test(mobile)) throw new Error("شماره موبایل معتبر نیست.");
  return mobile;
}

function hmac(value: string): string {
  return createHmac("sha256", authSecret()).update(value).digest("hex");
}

export function hashRequestIp(ip: string | null | undefined): string | null {
  const normalized = ip?.trim();
  if (!normalized) return null;
  return createHash("sha256").update(`${authSecret()}:ip:${normalized}`).digest("hex");
}

export function createOtpCode(): string {
  const dev = process.env.NODE_ENV !== "production" ? process.env.ELORIA_CUSTOMER_OTP_DEV_CODE?.trim() : "";
  if (dev && /^\d{6}$/.test(dev)) return dev;
  return String(randomInt(100000, 1000000));
}

export function hashOtp(challengeId: string, code: string): string {
  return hmac(`otp:${challengeId}:${code}`);
}

export function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export async function createCustomerOtpChallenge(input: { mobile: string; ip?: string | null }) {
  const mobile = normalizeIranMobile(input.mobile);
  const id = randomUUID();
  const code = createOtpCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + customerOtpMinutes() * 60_000);

  await prisma.customerOtpChallenge.updateMany({
    where: { mobile, consumedAt: null, expiresAt: { gt: now } },
    data: { consumedAt: now },
  });

  await prisma.customerOtpChallenge.create({
    data: {
      id,
      mobile,
      codeHash: hashOtp(id, code),
      expiresAt,
      requestIpHash: hashRequestIp(input.ip),
    },
  });

  return { id, mobile, code, expiresAt };
}

export async function consumeCustomerOtp(input: { challengeId: string; mobile: string; code: string }) {
  const mobile = normalizeIranMobile(input.mobile);
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) throw new Error("کد تأیید باید ۶ رقم باشد.");
  const now = new Date();

  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM customer_otp_challenges WHERE id = ${input.challengeId}::uuid FOR UPDATE`;
    const challenge = await tx.customerOtpChallenge.findUnique({ where: { id: input.challengeId } });
    if (!challenge || challenge.mobile !== mobile) throw new Error("درخواست کد تأیید معتبر نیست.");
    if (challenge.consumedAt) throw new Error("این کد قبلاً استفاده شده است.");
    if (challenge.expiresAt.getTime() <= now.getTime()) throw new Error("مهلت کد تأیید پایان یافته است.");
    if (challenge.attempts >= challenge.maxAttempts) throw new Error("تعداد تلاش‌های کد تأیید بیش از حد مجاز است.");

    const valid = safeEqualHex(challenge.codeHash, hashOtp(challenge.id, code));
    if (!valid) {
      await tx.customerOtpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new Error("کد تأیید صحیح نیست.");
    }

    await tx.customerOtpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 }, consumedAt: now },
    });

    const customer = await tx.customer.upsert({
      where: { mobile },
      create: { mobile, mobileVerifiedAt: now, lastLoginAt: now, isActive: true },
      update: { mobileVerifiedAt: now, lastLoginAt: now, isActive: true },
    });

    await tx.order.updateMany({
      where: { customerId: null, customerMobile: mobile },
      data: { customerId: customer.id },
    });

    return customer;
  });
}

export async function createCustomerSession(input: { customerId: string; ip?: string | null; userAgent?: string | null }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + customerSessionDays() * 24 * 60 * 60_000);
  await prisma.customerSession.create({
    data: {
      customerId: input.customerId,
      sessionHash: hmac(`session:${token}`),
      ipHash: hashRequestIp(input.ip),
      userAgent: input.userAgent?.slice(0, 500) || null,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export function setCustomerSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearCustomerSessionCookie(response: NextResponse) {
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getCustomerBySessionToken(token: string | null | undefined) {
  if (!token) return null;
  const now = new Date();
  const session = await prisma.customerSession.findUnique({
    where: { sessionHash: hmac(`session:${token}`) },
    include: { customer: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= now || !session.customer.isActive) return null;

  if (session.lastSeenAt.getTime() < now.getTime() - 5 * 60_000) {
    void prisma.customerSession.update({ where: { id: session.id }, data: { lastSeenAt: now } }).catch(() => undefined);
  }
  return { session, customer: session.customer };
}

export async function getCustomerFromRequest(request: NextRequest) {
  return getCustomerBySessionToken(request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
}

export async function getCurrentCustomer() {
  const store = await cookies();
  return getCustomerBySessionToken(store.get(CUSTOMER_SESSION_COOKIE)?.value);
}

export async function revokeCustomerSession(token: string | null | undefined) {
  if (!token) return;
  await prisma.customerSession.updateMany({
    where: { sessionHash: hmac(`session:${token}`), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
