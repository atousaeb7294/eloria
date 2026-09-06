import { NextRequest, NextResponse } from "next/server";
import {
  consumeCustomerOtp,
  createCustomerSession,
  setCustomerSessionCookie,
} from "@/lib/customer-auth";
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

type VerifyOtpBody = {
  challengeId?: unknown;
  channel?: unknown;
  mobile?: unknown;
  code?: unknown;
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
    return NextResponse.json(
      { successful: false, message: "مبدأ درخواست معتبر نیست." },
      { status: 403, headers: headers() },
    );
  }

  const rate = await consumeRateLimit({
    key: `customer-otp-verify:${ip}`,
    limit: 15,
    windowMs: 10 * 60_000,
  });
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
    return NextResponse.json(
      { successful: false, message: "تعداد تلاش‌های ورود بیش از حد مجاز است." },
      { status: 429, headers: { ...headers(), "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let body: VerifyOtpBody;
  try {
    body = await readJsonBody<VerifyOtpBody>(request, 8 * 1024);
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
    (body.channel !== undefined && body.channel !== "SMS") ||
    typeof body.challengeId !== "string" ||
    typeof body.mobile !== "string" ||
    typeof body.code !== "string"
  ) {
    return NextResponse.json(
      { successful: false, message: "اطلاعات کد ورود معتبر نیست." },
      { status: 400, headers: headers() },
    );
  }

  const subject = body.mobile;
  try {
    const customer = await consumeCustomerOtp({
      challengeId: body.challengeId,
      channel: "SMS",
      mobile: body.mobile,
      code: body.code,
      purpose: "LOGIN",
    });
    const session = await createCustomerSession({
      customerId: customer.id,
      ip,
      userAgent,
    });
    const response = NextResponse.json(
      {
        successful: true,
        customer: {
          id: customer.id,
          mobile: customer.mobile,
          fullName: customer.fullName,
        },
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
      subject,
      details: { reason: "sms-otp-login", channel: "SMS" },
      external: false,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "ورود ناموفق بود.";
    const inactive = message === "این حساب کاربری غیرفعال است.";
    await recordSecurityEvent({
      eventType: inactive ? "CUSTOMER_INACTIVE_ACCOUNT_LOGIN_BLOCKED" : "CUSTOMER_OTP_VERIFY_FAILED",
      severity: inactive ? "HIGH" : "MEDIUM",
      scope: "CUSTOMER_AUTH",
      successful: false,
      ip,
      userAgent,
      subject,
      details: { reason: inactive ? "inactive-account" : "otp-verification-rejected", channel: "SMS" },
      external: inactive,
      dispatchKey: inactive ? subject : undefined,
    });
    return NextResponse.json(
      { successful: false, message },
      { status: 400, headers: headers() },
    );
  }
}
