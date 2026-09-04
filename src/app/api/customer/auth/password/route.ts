import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerFromRequest,
  revokeOtherCustomerSessions,
} from "@/lib/customer-auth";
import {
  CustomerPasswordError,
  hashCustomerPassword,
  normalizeCustomerPassword,
  verifyCustomerPassword,
} from "@/lib/customer-password";
import { prisma } from "@/lib/prisma";
import { isCustomerAuthEnabled } from "@/lib/runtime-features";
import { JsonRequestBodyError, readJsonBody } from "@/lib/security/json-body";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { recordSecurityEvent } from "@/lib/security/security-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function headers() {
  return { "Cache-Control": "no-store", Pragma: "no-cache" };
}

type PasswordChangeBody = {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
};

export async function POST(request: NextRequest) {
  if (!isCustomerAuthEnabled()) {
    return NextResponse.json(
      { successful: false, message: "حساب مشتری در حال حاضر غیرفعال است." },
      { status: 503, headers: headers() },
    );
  }

  const ip = requestIp(request);
  const userAgent = request.headers.get("user-agent");
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { successful: false, message: "مبدأ درخواست معتبر نیست." },
      { status: 403, headers: headers() },
    );
  }

  const auth = await getCustomerFromRequest(request);
  if (!auth) {
    return NextResponse.json(
      { successful: false, message: "ابتدا وارد حساب شوید." },
      { status: 401, headers: headers() },
    );
  }

  const rate = await consumeRateLimit({
    key: `customer-password-change:${auth.customer.id}:${ip}`,
    limit: 6,
    windowMs: 15 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { successful: false, message: "تعداد تلاش‌های تغییر رمز بیش از حد مجاز است." },
      { status: 429, headers: { ...headers(), "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let body: PasswordChangeBody;
  try {
    body = await readJsonBody<PasswordChangeBody>(request, 8 * 1024);
  } catch (error) {
    const status = error instanceof JsonRequestBodyError ? error.status : 400;
    return NextResponse.json(
      {
        successful: false,
        message: error instanceof JsonRequestBodyError ? error.message : "بدنه درخواست معتبر نیست.",
      },
      { status, headers: headers() },
    );
  }

  if (typeof body.newPassword !== "string" || typeof body.confirmPassword !== "string") {
    return NextResponse.json(
      { successful: false, message: "رمز جدید معتبر نیست." },
      { status: 400, headers: headers() },
    );
  }

  let newPassword: string;
  try {
    newPassword = normalizeCustomerPassword(body.newPassword);
    if (newPassword !== body.confirmPassword) {
      throw new CustomerPasswordError("تکرار رمز عبور با رمز جدید یکسان نیست.");
    }
  } catch (error) {
    return NextResponse.json(
      { successful: false, message: error instanceof Error ? error.message : "رمز جدید معتبر نیست." },
      { status: 400, headers: headers() },
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { id: auth.customer.id },
    select: { id: true, mobile: true, fullName: true, passwordHash: true },
  });
  if (!customer) {
    return NextResponse.json(
      { successful: false, message: "حساب مشتری پیدا نشد." },
      { status: 404, headers: headers() },
    );
  }

  if (customer.passwordHash && !verifyCustomerPassword(body.currentPassword, customer.passwordHash)) {
    await recordSecurityEvent({
      eventType: "CUSTOMER_PASSWORD_CHANGE_FAILED",
      severity: "MEDIUM",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      subject: customer.mobile,
      details: { reason: "current-password-mismatch" },
      external: false,
    });
    return NextResponse.json(
      { successful: false, message: "رمز عبور فعلی صحیح نیست." },
      { status: 400, headers: headers() },
    );
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      passwordHash: hashCustomerPassword(newPassword),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
  await revokeOtherCustomerSessions(customer.id, auth.session.id);
  await recordSecurityEvent({
    eventType: "CUSTOMER_PASSWORD_CHANGED",
    severity: "INFO",
    scope: "CUSTOMER_AUTH",
    successful: true,
    ip,
    userAgent,
    subject: customer.mobile,
    details: { reason: customer.passwordHash ? "password-updated" : "password-created" },
    external: false,
  });
  return NextResponse.json(
    {
      successful: true,
      customer: { id: customer.id, mobile: customer.mobile, fullName: customer.fullName },
    },
    { headers: headers() },
  );
}
