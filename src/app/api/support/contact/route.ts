import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/lib/notifications/kavenegar";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { readJsonBody } from "@/lib/security/json-body";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function clean(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ successful: false, message: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const rate = await consumeRateLimit({ key: `contact:${requestIp(request)}`, limit: 5, windowMs: 10 * 60_000 });
  if (!rate.allowed) return NextResponse.json({ successful: false, message: "تعداد پیام‌های ارسالی بیش از حد مجاز است." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  const body = await readJsonBody<Record<string, unknown>>(request, 24 * 1024).catch(() => null);
  if (!body) return NextResponse.json({ successful: false, message: "ساختار پیام معتبر نیست." }, { status: 400 });
  const name = clean(body.name, 120), phone = clean(body.phone, 30), subject = clean(body.subject, 160), message = clean(body.message, 1200);
  if (!name || !phone || !subject || message.length < 10) return NextResponse.json({ successful: false, message: "اطلاعات فرم کامل نیست." }, { status: 400 });
  const webhook = process.env.ELORIA_SUPPORT_WEBHOOK_URL?.trim();
  const supportMobile = process.env.ELORIA_SUPPORT_MOBILE?.trim();
  let delivered = false;
  const errors: string[] = [];
  if (webhook) {
    try { const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "ELORIA_CONTACT", name, phone, subject, message, receivedAt: new Date().toISOString() }) }); if (response.ok) delivered = true; else errors.push("وب‌هوک پشتیبانی پاسخ موفق نداد."); }
    catch { errors.push("ارتباط با وب‌هوک پشتیبانی برقرار نشد."); }
  }
  if (supportMobile) {
    const sms = await sendSms(supportMobile, `درخواست جدید الوریا\n${name} - ${phone}\n${subject}\n${message.slice(0, 600)}`);
    if (sms.successful) delivered = true; else { console.error("[Eloria Support] SMS delivery failed.", sms.message); errors.push("ارسال پیامک پشتیبانی ناموفق بود."); }
  }
  if (!webhook && !supportMobile) return NextResponse.json({ successful: false, message: "کانال پشتیبانی هنوز پیکربندی نشده است." }, { status: 503 });
  return NextResponse.json({ successful: delivered, message: delivered ? "درخواست شما ثبت و برای پشتیبانی ارسال شد." : errors.join(" ") || "ارسال انجام نشد." }, { status: delivered ? 200 : 502 });
}
