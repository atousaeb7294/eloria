import { NextRequest, NextResponse } from "next/server";
import {
  createCustomerSession,
  normalizeIranMobile,
  setCustomerSessionCookie,
} from "@/lib/customer-auth";
import {
  verifyCustomerPassword,
} from "@/lib/customer-password";
import { prisma } from "@/lib/prisma";
import { isCustomerAuthEnabled } from "@/lib/runtime-features";
import { JsonRequestBodyError, readJsonBody } from "@/lib/security/json-body";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function headers() {
  return { "Cache-Control": "no-store", Pragma: "no-cache" };
}

type PasswordLoginBody = {
  mobile?: unknown;
  password?: unknown;
  turnstileToken?: unknown;
};

function failureResponse(message = "شماره موبایل یا رمز عبور صحیح نیست.") {
  return NextResponse.json(
    { successful: false, message },
    { status: 401, headers: headers() },
  );
}

export async function POST(request: NextRequest) {
  if (!isCustomerAuthEnabled()) {
    return NextResponse.json(
      { successful: false, message: "ورود مشتری در حال حاضر غیرفعال است." },
      { status: 503, headers: headers() },
    );
  }

  const ip = requestIp(request);
  const userAgent = request.headers.get("user-agent");

  if (!hasTrustedOrigin(request)) {
    await recordSecurityEvent({
      eventType: "CUSTOMER_AUTH_ORIGIN_REJECTED",
      severity: "MEDIUM",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      external: false,
    });
    return NextResponse.json(
      { successful: false, message: "مبدأ درخواست معتبر نیست." },
      { status: 403, headers: headers() },
    );
  }

  const ipRate = await consumeRateLimit({
    key: `customer-password-login-ip:${ip}`,
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (!ipRate.allowed) {
    await recordSecurityEvent({
      eventType: "CUSTOMER_PASSWORD_LOGIN_RATE_LIMITED",
      severity: "HIGH",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      details: { reason: "ip-rate-limit", retryAfterSeconds: ipRate.retryAfterSeconds },
      dispatchKey: ip,
    });
    return NextResponse.json(
      { successful: false, message: "تعداد تلاش‌های ورود بیش از حد مجاز است." },
      { status: 429, headers: { ...headers(), "Retry-After": String(ipRate.retryAfterSeconds) } },
    );
  }

  let body: PasswordLoginBody;
  try {
    body = await readJsonBody<PasswordLoginBody>(request, 8 * 1024);
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

  if (typeof body.mobile !== "string" || typeof body.password !== "string") {
    return failureResponse();
  }

  let mobile: string;
  try {
    mobile = normalizeIranMobile(body.mobile);
  } catch {
    return failureResponse();
  }

  const challengeCheck = await verifyTurnstileToken({
    token: typeof body.turnstileToken === "string" ? body.turnstileToken : null,
    ip,
    expectedAction: "customer-password-login",
  });
  if (!challengeCheck.successful) {
    await recordSecurityEvent({
      eventType: "CUSTOMER_TURNSTILE_FAILED",
      severity: "MEDIUM",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      subject: mobile,
      details: { reason: challengeCheck.errors[0] ?? "turnstile-failed", action: "customer-password-login" },
      external: false,
    });
    return NextResponse.json(
      { successful: false, message: "تأیید امنیتی ناموفق بود." },
      { status: 403, headers: headers() },
    );
  }

  const identityRate = await consumeRateLimit({
    key: `customer-password-login-mobile:${mobile}`,
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!identityRate.allowed) {
    await recordSecurityEvent({
      eventType: "CUSTOMER_PASSWORD_LOGIN_RATE_LIMITED",
      severity: "HIGH",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      subject: mobile,
      details: { reason: "mobile-rate-limit", retryAfterSeconds: identityRate.retryAfterSeconds },
      dispatchKey: mobile,
    });
    return NextResponse.json(
      { successful: false, message: "تعداد تلاش‌های ورود برای این شماره بیش از حد مجاز است." },
      { status: 429, headers: { ...headers(), "Retry-After": String(identityRate.retryAfterSeconds) } },
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { mobile },
    select: {
      id: true,
      mobile: true,
      fullName: true,
      passwordHash: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      isActive: true,
    },
  });
  const now = new Date();
  const locked = Boolean(customer?.lockedUntil && customer.lockedUntil > now);
  const valid = Boolean(
    customer &&
    customer.isActive &&
    !locked &&
    verifyCustomerPassword(body.password, customer.passwordHash),
  );

  if (!valid) {
    if (customer && customer.isActive && !locked && customer.passwordHash) {
      const failedAttempts = customer.failedLoginAttempts + 1;
      const nextLock = failedAttempts >= 5
        ? new Date(now.getTime() + 15 * 60_000)
        : null;
      await prisma.customer.update({
        where: { id: customer.id },
        data: { failedLoginAttempts: failedAttempts, lockedUntil: nextLock },
      });
    }
    await recordSecurityEvent({
      eventType: locked ? "CUSTOMER_PASSWORD_LOGIN_LOCKED" : "CUSTOMER_PASSWORD_LOGIN_FAILED",
      severity: locked ? "HIGH" : "MEDIUM",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      subject: mobile,
      details: { reason: locked ? "account-lock" : "invalid-password" },
      external: locked,
      dispatchKey: locked ? mobile : undefined,
    });
    return failureResponse(locked ? "به‌دلیل تلاش‌های ناموفق، ورود این حساب موقتاً قفل شده است." : undefined);
  }

  // `valid` is intentionally a boolean expression for the generic failure
  // path above. Narrow the record explicitly before touching its fields.
  if (!customer) {
    return failureResponse();
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
  });
  const session = await createCustomerSession({
    customerId: customer.id,
    ip,
    userAgent,
  });
  const response = NextResponse.json(
    {
      successful: true,
      customer: { id: customer.id, mobile: customer.mobile, fullName: customer.fullName },
    },
    { headers: headers() },
  );
  setCustomerSessionCookie(response, session.token, session.expiresAt);
  await recordSecurityEvent({
    eventType: "CUSTOMER_LOGIN_SUCCEEDED",
    severity: "INFO",
    scope: "CUSTOMER_AUTH",
    successful: true,
    ip,
    userAgent,
    subject: mobile,
    details: { reason: "password-login", channel: "PASSWORD" },
    external: false,
  });
  return response;
}
