import { NextRequest, NextResponse } from "next/server";
import {
  consumeCustomerOtp,
  createCustomerSession,
  normalizeIranMobile,
  revokeOtherCustomerSessions,
  setCustomerSessionCookie,
  type CustomerOtpPurpose,
} from "@/lib/customer-auth";
import {
  CustomerPasswordError,
  hashCustomerPassword,
  normalizeCustomerPassword,
} from "@/lib/customer-password";
import { CustomerDataError, normalizeCustomerName } from "@/lib/customer-data";
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

type VerifyPasswordOtpBody = {
  purpose?: unknown;
  challengeId?: unknown;
  mobile?: unknown;
  code?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  fullName?: unknown;
};

function isPurpose(value: unknown): value is Exclude<CustomerOtpPurpose, "LOGIN"> {
  return value === "SIGNUP" || value === "PASSWORD_RESET";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
    key: `customer-password-verify-ip:${ip}`,
    limit: 15,
    windowMs: 15 * 60_000,
  });
  if (!ipRate.allowed) {
    return NextResponse.json(
      { successful: false, message: "تعداد تلاش‌های ورود بیش از حد مجاز است." },
      { status: 429, headers: { ...headers(), "Retry-After": String(ipRate.retryAfterSeconds) } },
    );
  }

  let body: VerifyPasswordOtpBody;
  try {
    body = await readJsonBody<VerifyPasswordOtpBody>(request, 8 * 1024);
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

  if (
    !isPurpose(body.purpose) ||
    typeof body.challengeId !== "string" ||
    !isUuid(body.challengeId) ||
    typeof body.mobile !== "string" ||
    typeof body.code !== "string" ||
    typeof body.password !== "string" ||
    typeof body.confirmPassword !== "string"
  ) {
    return NextResponse.json(
      { successful: false, message: "اطلاعات تأیید رمز معتبر نیست." },
      { status: 400, headers: headers() },
    );
  }

  let mobile: string;
  let password: string;
  let fullName: string | undefined;
  try {
    mobile = normalizeIranMobile(body.mobile);
    password = normalizeCustomerPassword(body.password);
    if (password !== body.confirmPassword) {
      throw new CustomerPasswordError("تکرار رمز عبور با رمز جدید یکسان نیست.");
    }
    if (body.purpose === "SIGNUP") {
      fullName = normalizeCustomerName(body.fullName);
    }
  } catch (error) {
    const message = error instanceof CustomerPasswordError || error instanceof CustomerDataError || error instanceof Error
      ? error.message
      : "اطلاعات واردشده معتبر نیست.";
    return NextResponse.json(
      { successful: false, message },
      { status: 400, headers: headers() },
    );
  }

  const mobileRate = await consumeRateLimit({
    key: `customer-password-verify-mobile:${mobile}`,
    limit: 8,
    windowMs: 15 * 60_000,
  });
  if (!mobileRate.allowed) {
    return NextResponse.json(
      { successful: false, message: "تعداد تلاش‌های این شماره بیش از حد مجاز است." },
      { status: 429, headers: { ...headers(), "Retry-After": String(mobileRate.retryAfterSeconds) } },
    );
  }

  try {
    const customer = await consumeCustomerOtp({
      challengeId: body.challengeId,
      channel: "SMS",
      purpose: body.purpose,
      mobile,
      code: body.code,
    });

    if (body.purpose === "SIGNUP" && customer.passwordHash) {
      throw new Error("این شماره قبلاً ثبت‌نام کرده است. از گزینهٔ ورود استفاده کنید.");
    }

    const profileFields = body.purpose === "SIGNUP" && fullName
      ? { fullName }
      : {};

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: hashCustomerPassword(password),
        failedLoginAttempts: 0,
        lockedUntil: null,
        mobileVerifiedAt: new Date(),
        lastLoginAt: new Date(),
        ...profileFields,
      },
      select: { id: true, mobile: true, fullName: true },
    });

    await revokeOtherCustomerSessions(updated.id);
    const session = await createCustomerSession({
      customerId: updated.id,
      ip,
      userAgent,
    });
    const response = NextResponse.json(
      {
        successful: true,
        customer: { id: updated.id, mobile: updated.mobile, fullName: updated.fullName },
      },
      { headers: headers() },
    );
    setCustomerSessionCookie(response, session.token, session.expiresAt);
    await recordSecurityEvent({
      eventType: body.purpose === "SIGNUP" ? "CUSTOMER_SIGNUP_SUCCEEDED" : "CUSTOMER_PASSWORD_RESET_SUCCEEDED",
      severity: "INFO",
      scope: "CUSTOMER_AUTH",
      successful: true,
      ip,
      userAgent,
      subject: mobile,
      details: { purpose: body.purpose, channel: "SMS" },
      external: false,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "تأیید کد و تنظیم رمز ناموفق بود.";
    await recordSecurityEvent({
      eventType: "CUSTOMER_PASSWORD_OTP_VERIFY_FAILED",
      severity: "MEDIUM",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      subject: mobile,
      details: { reason: "password-otp-verification-rejected", purpose: body.purpose },
      external: false,
    });
    return NextResponse.json(
      { successful: false, message },
      { status: 400, headers: headers() },
    );
  }
}
