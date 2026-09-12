import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPreorderAvailable, normalizePreorder, preorderMessage } from "@/lib/product-preorder";
import { readJsonBody } from "@/lib/security/json-body";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { supportChatTurnstileRequired } from "@/lib/support-chat";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const reply = (message: string, status: number) => NextResponse.json({ successful: false, message }, { status, headers });

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasTrustedOrigin(request)) return reply("مبدأ درخواست معتبر نیست.", 403);
  try {
    const ip = requestIp(request);
    const rate = await consumeRateLimit({ key: `preorder:${ip}`, limit: 8, windowMs: 10 * 60_000 });
    if (!rate.allowed) return reply("تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید.", 429);
    let input: ReturnType<typeof normalizePreorder>;
    try { input = normalizePreorder(await readJsonBody(request, 12 * 1024)); }
    catch { return reply("نام، شماره همراه، تعداد یا مشخصات درخواست معتبر نیست.", 400); }
    if (supportChatTurnstileRequired()) {
      const challenge = await verifyTurnstileToken({ token: input.turnstileToken ?? null, ip, expectedAction: "support-contact" });
      if (!challenge.successful) return reply("تأیید امنیتی ناموفق بود؛ دوباره تلاش کنید.", 403);
    }
    const phoneRate = await consumeRateLimit({ key: `preorder-phone:${input.phone}`, limit: 5, windowMs: 30 * 60_000 });
    if (!phoneRate.allowed) return reply("برای این شماره اخیراً چند درخواست ثبت شده است.", 429);
    const { slug } = await params;
    const product = await prisma.product.findFirst({
      where: { slug, status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, collection: { isActive: true } },
      select: { id: true, slug: true, nameFa: true, status: true, stock: true, collection: { select: { isActive: true } }, variants: { where: { isActive: true }, select: { id: true, titleFa: true, stock: true, isActive: true } } },
    });
    if (!product) return reply("این محصول برای پیش‌سفارش در دسترس نیست.", 404);
    const variant = input.variantId ? product.variants.find(v => v.id === input.variantId) : null;
    if (input.variantId && !variant) return reply("مدل انتخاب‌شده معتبر نیست.", 400);
    const body = preorderMessage(input, product, variant);
    const existing = await prisma.supportMessage.findUnique({ where: { id: input.requestId }, select: { body: true } });
    if (existing && existing.body !== body) return reply("این شناسه قبلاً برای درخواست دیگری استفاده شده است.", 409);
    if (!existing && !isPreorderAvailable(product, variant)) return reply("این محصول اکنون موجود است؛ از افزودن به سبد خرید استفاده کنید.", 409);
    if (!existing) {
      try {
        await prisma.supportConversation.create({ data: {
          accessTokenHash: randomBytes(32).toString("hex"), locale: input.locale,
          visitorName: input.name, visitorPhone: input.phone, status: "OPEN",
          messages: { create: { id: input.requestId, author: "VISITOR", body } },
        }, select: { id: true } });
      } catch (error) {
        // The unique message ID makes simultaneous retries one persisted request.
        if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error;
        const duplicate = await prisma.supportMessage.findUnique({ where: { id: input.requestId }, select: { body: true } });
        if (duplicate?.body !== body) return reply("شناسهٔ درخواست تکراری است؛ فرم را دوباره باز کنید.", 409);
      }
    }
    return NextResponse.json({ successful: true, reference: input.requestId, message: input.locale === "fa" ? "درخواست پیش‌سفارش ثبت شد. برای تأیید امکان تأمین، زمان تحویل و قیمت نهایی با شما تماس می‌گیریم. هنوز پرداخت یا رزرو موجودی انجام نشده است." : "Your preorder request is recorded. We will contact you to confirm availability, delivery time and final price. No payment or inventory reservation has been made." }, { status: existing ? 200 : 201, headers });
  } catch (error) {
    console.error("[Eloria Preorder] Request could not be saved.", error);
    return reply("ثبت پیش‌سفارش موقتاً ممکن نیست؛ دوباره تلاش کنید.", 503);
  }
}
