import { NextRequest, NextResponse } from "next/server";
import { consumeCustomerOtp, createCustomerSession, setCustomerSessionCookie } from "@/lib/customer-auth";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ successful: false, message: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const ip = requestIp(request);
  const rate = await consumeRateLimit({ key: `customer-otp-verify:${ip}`, limit: 15, windowMs: 10 * 60_000 });
  if (!rate.allowed) return NextResponse.json({ successful: false, message: "تعداد تلاش‌های ورود بیش از حد مجاز است." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });

  const body = await request.json().catch(() => null) as { challengeId?: unknown; mobile?: unknown; code?: unknown } | null;
  if (!body || typeof body.challengeId !== "string" || typeof body.mobile !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ successful: false, message: "اطلاعات کد ورود معتبر نیست." }, { status: 400 });
  }

  try {
    const customer = await consumeCustomerOtp({ challengeId: body.challengeId, mobile: body.mobile, code: body.code });
    const session = await createCustomerSession({ customerId: customer.id, ip, userAgent: request.headers.get("user-agent") });
    const response = NextResponse.json({ successful: true, customer: { id: customer.id, mobile: customer.mobile, fullName: customer.fullName, email: customer.email } });
    setCustomerSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return NextResponse.json({ successful: false, message: error instanceof Error ? error.message : "ورود ناموفق بود." }, { status: 400 });
  }
}
