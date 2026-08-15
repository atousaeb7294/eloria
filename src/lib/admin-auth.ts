import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import {
  prisma,
  withDatabaseRetry,
} from "@/lib/prisma";

const ADMIN_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-eloria_admin_session"
    : "eloria_admin_session";
const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;

type AdminSessionPayload = {
  sessionId: string;
  expiresAt: number;
  version: string;
};

function env(key: string): string {
  return process.env[key]?.trim() ?? "";
}
function adminUsername(): string {
  return env("ELORIA_ADMIN_USERNAME");
}
function adminPassword(): string {
  return env("ELORIA_ADMIN_PASSWORD");
}
function sessionSecret(): string {
  return env("ELORIA_ADMIN_SESSION_SECRET");
}
function sessionVersion(): string {
  return env("ELORIA_ADMIN_SESSION_VERSION") || "1";
}
function totpSecret(): string {
  return env("ELORIA_ADMIN_TOTP_SECRET").replace(/\s+/g, "").toUpperCase();
}

export function isAdminTotpRequired(): boolean {
  return totpSecret().length > 0;
}

export function isAdminConfigured(): boolean {
  return (
    adminUsername().length >= 3 &&
    adminPassword().length >= 14 &&
    sessionSecret().length >= 48 &&
    sessionVersion().length >= 1
  );
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", sessionSecret()).update(encodedPayload).digest("base64url");
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseSessionToken(token: string): AdminSessionPayload | null {
  if (!isAdminConfigured()) return null;
  const [encodedPayload, suppliedSignature] = token.split(".");
  if (!encodedPayload || !suppliedSignature) return null;
  const expected = signPayload(encodedPayload);
  if (!safeEqual(suppliedSignature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<AdminSessionPayload>;
    if (
      typeof payload.sessionId !== "string" ||
      typeof payload.expiresAt !== "number" ||
      typeof payload.version !== "string" ||
      payload.expiresAt <= Math.floor(Date.now() / 1000) ||
      payload.version !== sessionVersion()
    ) return null;
    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}

function decodeBase32(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.replace(/=+$/, "")) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid base32 secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpAt(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const code =
    (((digest[offset]! & 0x7f) << 24) |
      ((digest[offset + 1]! & 0xff) << 16) |
      ((digest[offset + 2]! & 0xff) << 8) |
      (digest[offset + 3]! & 0xff)) %
    1_000_000;
  return code.toString().padStart(6, "0");
}

export function verifyAdminCredentials(input: {
  username: string;
  password: string;
  totpCode: string;
}): boolean {
  if (!isAdminConfigured()) return false;
  if (!safeEqual(input.username.trim(), adminUsername())) return false;
  if (!safeEqual(input.password, adminPassword())) return false;
  if (!isAdminTotpRequired()) return true;
  if (!/^\d{6}$/.test(input.totpCode)) return false;
  const current = Math.floor(Date.now() / 30_000);
  return [-1, 0, 1].some(delta => safeEqual(input.totpCode, totpAt(totpSecret(), current + delta)));
}

export async function recordAdminSecurityEvent(input: {
  eventType: string;
  successful: boolean;
  ip?: string | null;
  userAgent?: string | null;
  payload?: unknown;
}): Promise<void> {
  await prisma.adminSecurityEvent.create({
    data: {
      eventType: input.eventType.slice(0, 100),
      successful: input.successful,
      ipHash: input.ip ? hash(input.ip) : null,
      userAgent: input.userAgent?.slice(0, 500) || null,
      payload: input.payload === undefined ? undefined : json(input.payload),
    },
  }).catch(error => console.error("[Eloria Admin Audit]", error));
}

export async function createAdminSession(input: {
  ip?: string | null;
  userAgent?: string | null;
} = {}): Promise<void> {
  const sessionId = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS;
  const nonce = randomBytes(32).toString("base64url");
  const sessionHash = hash(`${sessionId}:${nonce}`);
  await withDatabaseRetry(() => prisma.adminSession.create({
    data: {
      id: sessionId,
      sessionHash,
      ipHash: input.ip ? hash(input.ip) : null,
      userAgent: input.userAgent?.slice(0, 500) || null,
      expiresAt: new Date(expiresAt * 1000),
    },
  }));
  const payload: AdminSessionPayload = { sessionId, expiresAt, version: sessionVersion() };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const token = `${encodedPayload}.${signPayload(encodedPayload)}.${nonce}`;
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_LIFETIME_SECONDS,
    expires: new Date(expiresAt * 1000),
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (token) {
    const [encodedPayload, , nonce] = token.split(".");
    if (encodedPayload && nonce) {
      try {
        const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<AdminSessionPayload>;
        if (typeof payload.sessionId === "string") {
          await withDatabaseRetry(() => prisma.adminSession.updateMany({
            where: { id: payload.sessionId, sessionHash: hash(`${payload.sessionId}:${nonce}`) },
            data: { revokedAt: new Date() },
          }));
        }
      } catch {
        // Invalid cookies are deleted below.
      }
    }
  }
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function hasValidAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  const [encodedPayload, signature, nonce] = token.split(".");
  if (!encodedPayload || !signature || !nonce) return false;
  const payload = parseSessionToken(`${encodedPayload}.${signature}`);
  if (!payload) return false;
  try {
    const session = await withDatabaseRetry(() => prisma.adminSession.findFirst({
    where: {
      id: payload.sessionId,
      sessionHash: hash(`${payload.sessionId}:${nonce}`),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  }));
    return Boolean(session);
  } catch (error) {
    console.error(
      "[Eloria Admin Session] Database check failed.",
      error,
    );

    return false;
  }
}

export async function requireAdmin(locale: string): Promise<void> {
  if (!(await hasValidAdminSession())) redirect(`/${locale}/admin/login`);
}
