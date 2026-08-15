import { NextRequest, NextResponse } from "next/server";
import { createCustomerOtpChallenge, normalizeIranMobile } from "@/lib/customer-auth";
import { sendSms } from "@/lib/notifications/kavenegar";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function headers() { return { "Cache-Control": "no-store", Pragma: "no-cache" }; }

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ successful: false, message: "مبدأ درخواست معتبر نیست." }, { status: 403, headers: headers() });
  const ip = requestIp(request);
  const ipRate = await consumeRateLimit({ key: `customer-otp-ip:${ip}`, limit: 6, windowMs: 10 * 60_000 });
  if (!ipRate.allowed) return NextResponse.json({ successful: false, message: "درخواست کد بیش از حد مجاز است." }, { status: 429, headers: { ...headers(), "Retry-After": String(ipRate.retryAfterSeconds) } });

  const body = await request.json().catch(() => null) as { mobile?: unknown; turnstileToken?: unknown } | null;
  if (!body || typeof body.mobile !== "string") return NextResponse.json({ successful: false, message: "شماره موبایل معتبر نیست." }, { status: 400, headers: headers() });

  let mobile: string;
  try { mobile = normalizeIranMobile(body.mobile); }
  catch (error) { return NextResponse.json({ successful: false, message: error instanceof Error ? error.message : "شماره موبایل معتبر نیست." }, { status: 400, headers: headers() }); }

  const challengeCheck = await verifyTurnstileToken({ token: typeof body.turnstileToken === "string" ? body.turnstileToken : null, ip });
  if (!challengeCheck.successful) return NextResponse.json({ successful: false, message: "تأیید امنیتی ناموفق بود." }, { status: 403, headers: headers() });

  const mobileRate = await consumeRateLimit({ key: `customer-otp-mobile:${mobile}`, limit: 3, windowMs: 10 * 60_000 });
  if (!mobileRate.allowed) return NextResponse.json({ successful: false, message: "برای این شماره اخیراً چند کد ارسال شده است." }, { status: 429, headers: { ...headers(), "Retry-After": String(mobileRate.retryAfterSeconds) } });

  try {
    const challenge = await createCustomerOtpChallenge({ mobile, ip });
    const developmentCode = process.env.NODE_ENV !== "production" ? process.env.ELORIA_CUSTOMER_OTP_DEV_CODE?.trim() : "";
    const developmentMode = Boolean(developmentCode && /^\d{6}$/.test(developmentCode));

    if (!developmentMode) {
      const sms = await sendSms(mobile, `الوریا: کد ورود شما ${challenge.code} است. این کد تا چند دقیقه معتبر است.`);
      if (!sms.configured || !sms.successful) {
        await prisma.customerOtpChallenge.deleteMany({ where: { id: challenge.id } });
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
    return NextResponse.json({ successful: false, message: "ارسال کد ورود در حال حاضر امکان‌پذیر نیست." }, { status: 500, headers: headers() });
  }
}
