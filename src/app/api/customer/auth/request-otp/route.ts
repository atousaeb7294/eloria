import { NextRequest, NextResponse } from "next/server";
import { createCustomerOtpChallenge, normalizeIranMobile } from "@/lib/customer-auth";
import { sendSms } from "@/lib/notifications/kavenegar";
import { prisma } from "@/lib/prisma";
import { isCustomerAuthEnabled } from "@/lib/runtime-features";
import { JsonRequestBodyError, readJsonBody } from "@/lib/security/json-body";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function headers() { return { "Cache-Control": "no-store", Pragma: "no-cache" }; }

type OtpRequestBody = {
  mobile?: unknown;
  turnstileToken?: unknown;
};

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
    return NextResponse.json({ successful: false, message: "مبدأ درخواست معتبر نیست." }, { status: 403, headers: headers() });
  }

  const ipRate = await consumeRateLimit({ key: `customer-otp-ip:${ip}`, limit: 6, windowMs: 10 * 60_000 });
  if (!ipRate.allowed) {
    await recordSecurityEvent({
      eventType: "CUSTOMER_OTP_IP_RATE_LIMITED",
      severity: "HIGH",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      details: { reason: "ip-rate-limit", retryAfterSeconds: ipRate.retryAfterSeconds },
      dispatchKey: ip,
    });
    return NextResponse.json({ successful: false, message: "درخواست کد بیش از حد مجاز است." }, { status: 429, headers: { ...headers(), "Retry-After": String(ipRate.retryAfterSeconds) } });
  }

  let body: OtpRequestBody;
  try {
    body = await readJsonBody<OtpRequestBody>(request, 8 * 1024);
  } catch (error) {
    const status = error instanceof JsonRequestBodyError ? error.status : 400;
    return NextResponse.json({ successful: false, message: error instanceof JsonRequestBodyError ? error.message : "بدنه درخواست معتبر نیست." }, { status, headers: headers() });
  }

  if (typeof body.mobile !== "string") return NextResponse.json({ successful: false, message: "شماره موبایل معتبر نیست." }, { status: 400, headers: headers() });

  let mobile: string;
  try { mobile = normalizeIranMobile(body.mobile); }
  catch (error) { return NextResponse.json({ successful: false, message: error instanceof Error ? error.message : "شماره موبایل معتبر نیست." }, { status: 400, headers: headers() }); }

  const challengeCheck = await verifyTurnstileToken({
    token: typeof body.turnstileToken === "string" ? body.turnstileToken : null,
    ip,
    expectedAction: "customer-login",
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
      details: { reason: challengeCheck.errors[0] ?? "turnstile-failed" },
      external: false,
    });
    return NextResponse.json({ successful: false, message: "تأیید امنیتی ناموفق بود." }, { status: 403, headers: headers() });
  }

  const mobileRate = await consumeRateLimit({ key: `customer-otp-mobile:${mobile}`, limit: 3, windowMs: 10 * 60_000 });
  if (!mobileRate.allowed) {
    await recordSecurityEvent({
      eventType: "CUSTOMER_OTP_MOBILE_RATE_LIMITED",
      severity: "HIGH",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      subject: mobile,
      details: { reason: "mobile-rate-limit", retryAfterSeconds: mobileRate.retryAfterSeconds },
      dispatchKey: mobile,
    });
    return NextResponse.json({ successful: false, message: "برای این شماره اخیراً چند کد ارسال شده است." }, { status: 429, headers: { ...headers(), "Retry-After": String(mobileRate.retryAfterSeconds) } });
  }

  try {
    const challenge = await createCustomerOtpChallenge({ mobile, ip });
    const developmentCode = process.env.NODE_ENV !== "production" ? process.env.ELORIA_CUSTOMER_OTP_DEV_CODE?.trim() : "";
    const developmentMode = Boolean(developmentCode && /^\d{6}$/.test(developmentCode));

    if (!developmentMode) {
      const sms = await sendSms(mobile, `الوریا: کد ورود شما ${challenge.code} است. این کد تا چند دقیقه معتبر است.`);
      if (!sms.configured || !sms.successful) {
        await prisma.customerOtpChallenge.deleteMany({ where: { id: challenge.id } });
        await recordSecurityEvent({
          eventType: "CUSTOMER_OTP_DELIVERY_FAILED",
          severity: "HIGH",
          scope: "CUSTOMER_AUTH",
          successful: false,
          ip,
          userAgent,
          subject: mobile,
          details: { provider: "KAVENEGAR", configured: sms.configured, reason: "otp-delivery-failed" },
          dispatchKey: "kavenegar-otp-delivery",
        });
        return NextResponse.json({ successful: false, message: sms.configured ? "ارسال پیامک ناموفق بود. لطفاً دوباره تلاش کنید." : "سامانه پیامک ورود پیکربندی نشده است." }, { status: 503, headers: headers() });
      }
    }

    return NextResponse.json({
      successful: true,
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt.toISOString(),
      ...(developmentMode ? { developmentCode: challenge.code } : {}),
    }, { status: 200, headers: headers() });
  } catch (error) {
    console.error("[Eloria Customer OTP] request failed", error);
    await recordSecurityEvent({
      eventType: "CUSTOMER_OTP_REQUEST_ERROR",
      severity: "HIGH",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      subject: mobile,
      details: { reason: "otp-request-error", errorType: error instanceof Error ? error.name : "unknown" },
      dispatchKey: "customer-otp-request-error",
    });
    return NextResponse.json({ successful: false, message: "ارسال کد ورود در حال حاضر امکان‌پذیر نیست." }, { status: 500, headers: headers() });
  }
}
