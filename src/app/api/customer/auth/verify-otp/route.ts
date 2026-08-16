import { NextRequest, NextResponse } from "next/server";
import { consumeCustomerOtp, createCustomerSession, setCustomerSessionCookie } from "@/lib/customer-auth";
import { JsonRequestBodyError, readJsonBody } from "@/lib/security/json-body";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { recordSecurityEvent } from "@/lib/security/security-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyOtpBody = {
  challengeId?: unknown;
  mobile?: unknown;
  code?: unknown;
};

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ successful: false, message: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  }

  const rate = await consumeRateLimit({ key: `customer-otp-verify:${ip}`, limit: 15, windowMs: 10 * 60_000 });
  if (!rate.allowed) {
    await recordSecurityEvent({
      eventType: "CUSTOMER_OTP_VERIFY_RATE_LIMITED",
      severity: "HIGH",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      details: { reason: "otp-verify-rate-limit", retryAfterSeconds: rate.retryAfterSeconds },
      dispatchKey: ip,
    });
    return NextResponse.json({ successful: false, message: "تعداد تلاش‌های ورود بیش از حد مجاز است." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

  let body: VerifyOtpBody;
  try {
    body = await readJsonBody<VerifyOtpBody>(request, 8 * 1024);
  } catch (error) {
    const status = error instanceof JsonRequestBodyError ? error.status : 400;
    return NextResponse.json({ successful: false, message: error instanceof JsonRequestBodyError ? error.message : "بدنه درخواست معتبر نیست." }, { status });
  }

  if (typeof body.challengeId !== "string" || typeof body.mobile !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ successful: false, message: "اطلاعات کد ورود معتبر نیست." }, { status: 400 });
  }

  try {
    const customer = await consumeCustomerOtp({ challengeId: body.challengeId, mobile: body.mobile, code: body.code });
    const session = await createCustomerSession({ customerId: customer.id, ip, userAgent });
    const response = NextResponse.json({ successful: true, customer: { id: customer.id, mobile: customer.mobile, fullName: customer.fullName, email: customer.email } });
    setCustomerSessionCookie(response, session.token, session.expiresAt);

    await recordSecurityEvent({
      eventType: "CUSTOMER_LOGIN_SUCCEEDED",
      severity: "INFO",
      scope: "CUSTOMER_AUTH",
      successful: true,
      ip,
      userAgent,
      subject: customer.mobile,
      details: { reason: "otp-login" },
      external: false,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "ورود ناموفق بود.";
    const inactive = message === "این حساب کاربری غیرفعال است.";

    await recordSecurityEvent({
      eventType: inactive
        ? "CUSTOMER_INACTIVE_ACCOUNT_LOGIN_BLOCKED"
        : "CUSTOMER_OTP_VERIFY_FAILED",
      severity: inactive ? "HIGH" : "MEDIUM",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      subject: body.mobile,
      details: { reason: inactive ? "inactive-account" : "otp-verification-rejected" },
      external: inactive,
      dispatchKey: inactive ? body.mobile : undefined,
    });

    return NextResponse.json({ successful: false, message }, { status: 400 });
  }
}
