import { NextRequest, NextResponse } from "next/server";
import {
  createCustomerOtpChallenge,
  normalizeIranMobile,
  type CustomerOtpPurpose,
} from "@/lib/customer-auth";
import { isCustomerOtpChannelEnabled } from "@/lib/customer-auth-channels";
import { sendVerificationSms } from "@/lib/notifications/sms-ir";
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

type PasswordOtpRequestBody = {
  purpose?: unknown;
  mobile?: unknown;
  turnstileToken?: unknown;
};

function isPurpose(value: unknown): value is Exclude<CustomerOtpPurpose, "LOGIN"> {
  return value === "SIGNUP" || value === "PASSWORD_RESET";
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
    key: `customer-password-otp-ip:${ip}`,
    limit: 6,
    windowMs: 10 * 60_000,
  });
  if (!ipRate.allowed) {
    return NextResponse.json(
      { successful: false, message: "درخواست کد بیش از حد مجاز است." },
      { status: 429, headers: { ...headers(), "Retry-After": String(ipRate.retryAfterSeconds) } },
    );
  }

  let body: PasswordOtpRequestBody;
  try {
    body = await readJsonBody<PasswordOtpRequestBody>(request, 8 * 1024);
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

  if (!isPurpose(body.purpose) || typeof body.mobile !== "string") {
    return NextResponse.json(
      { successful: false, message: "اطلاعات درخواست معتبر نیست." },
      { status: 400, headers: headers() },
    );
  }

  let mobile: string;
  try {
    mobile = normalizeIranMobile(body.mobile);
  } catch (error) {
    return NextResponse.json(
      { successful: false, message: error instanceof Error ? error.message : "شماره موبایل معتبر نیست." },
      { status: 400, headers: headers() },
    );
  }

  const challengeCheck = await verifyTurnstileToken({
    token: typeof body.turnstileToken === "string" ? body.turnstileToken : null,
    ip,
    expectedAction: "customer-password-recovery",
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
      details: { reason: challengeCheck.errors[0] ?? "turnstile-failed", action: "customer-password-recovery" },
      external: false,
    });
    return NextResponse.json(
      { successful: false, message: "تأیید امنیتی ناموفق بود." },
      { status: 403, headers: headers() },
    );
  }

  const mobileRate = await consumeRateLimit({
    key: `customer-password-otp-mobile:${mobile}`,
    limit: 3,
    windowMs: 10 * 60_000,
  });
  if (!mobileRate.allowed) {
    return NextResponse.json(
      { successful: false, message: "برای این شماره اخیراً چند کد ارسال شده است." },
      { status: 429, headers: { ...headers(), "Retry-After": String(mobileRate.retryAfterSeconds) } },
    );
  }

  if (!isCustomerOtpChannelEnabled("SMS")) {
    return NextResponse.json(
      { successful: false, message: "سامانه پیامک پیکربندی نشده است." },
      { status: 503, headers: headers() },
    );
  }

  const existing = await prisma.customer.findUnique({
    where: { mobile },
    select: { id: true, isActive: true, passwordHash: true },
  });

  if (body.purpose === "PASSWORD_RESET" && (!existing || !existing.isActive)) {
    // Keep the response intentionally generic so this endpoint cannot be used
    // to enumerate registered mobile numbers.
    return NextResponse.json(
      { successful: true, challengeId: null, message: "اگر این شماره حساب فعالی داشته باشد، کد بازیابی ارسال می‌شود." },
      { status: 200, headers: headers() },
    );
  }

  if (body.purpose === "SIGNUP" && existing?.passwordHash) {
    return NextResponse.json(
      { successful: false, message: "این شماره قبلاً ثبت‌نام کرده است. از گزینهٔ ورود یا فراموشی رمز استفاده کنید." },
      { status: 409, headers: headers() },
    );
  }

  try {
    const challenge = await createCustomerOtpChallenge({
      channel: "SMS",
      purpose: body.purpose,
      mobile,
      ip,
    });
    const developmentCode = process.env.NODE_ENV !== "production"
      ? process.env.ELORIA_CUSTOMER_OTP_DEV_CODE?.trim()
      : "";
    const developmentMode = Boolean(developmentCode && /^\d{6}$/.test(developmentCode));

    if (!developmentMode) {
      const sms = await sendVerificationSms(mobile, challenge.code);
      if (!sms.configured || !sms.successful) {
        await prisma.customerOtpChallenge.deleteMany({ where: { id: challenge.id } });
        await recordSecurityEvent({
          eventType: "CUSTOMER_PASSWORD_OTP_DELIVERY_FAILED",
          severity: "HIGH",
          scope: "CUSTOMER_AUTH",
          successful: false,
          ip,
          userAgent,
          subject: mobile,
          details: { provider: "SMS_IR", configured: sms.configured, purpose: body.purpose },
          dispatchKey: "sms-ir-password-otp-delivery",
        });
        return NextResponse.json(
          { successful: false, message: sms.configured ? "ارسال پیامک ناموفق بود. لطفاً دوباره تلاش کنید." : "سامانه پیامک پیکربندی نشده است." },
          { status: 503, headers: headers() },
        );
      }
    }

    return NextResponse.json(
      {
        successful: true,
        purpose: body.purpose,
        challengeId: challenge.id,
        expiresAt: challenge.expiresAt.toISOString(),
        ...(developmentMode ? { developmentCode: challenge.code } : {}),
      },
      { status: 200, headers: headers() },
    );
  } catch (error) {
    console.error("[Eloria Customer Password OTP] request failed.", error);
    await recordSecurityEvent({
      eventType: "CUSTOMER_PASSWORD_OTP_REQUEST_ERROR",
      severity: "HIGH",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      subject: mobile,
      details: { reason: "password-otp-request-error", errorType: error instanceof Error ? error.name : "unknown" },
      dispatchKey: "customer-password-otp-request-error",
    });
    return NextResponse.json(
      { successful: false, message: "ارسال کد در حال حاضر امکان‌پذیر نیست." },
      { status: 500, headers: headers() },
    );
  }
}
