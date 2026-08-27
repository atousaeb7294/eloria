import { NextRequest, NextResponse } from "next/server";

import { normalizeCheckoutMobile, CheckoutCustomerError } from "@/lib/checkout-customer";
import { normalizeCouponCode, previewCoupon, CouponValidationError } from "@/lib/coupons";
import { getProductLivePrice, ProductPricingError } from "@/lib/product-pricing";
import { calculateShipping } from "@/lib/shipping";
import { JsonRequestBodyError, readJsonBody } from "@/lib/security/json-body";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type IncomingItem = { slug?: unknown; variantId?: unknown; quantity?: unknown };
type ValidItem = { slug: string; variantId: string | null; quantity: number };

function headers(): HeadersInit {
  return { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" };
}

function normalizeItem(value: unknown): ValidItem | null {
  if (typeof value !== "object" || value === null) return null;
  const item = value as IncomingItem;
  if (typeof item.slug !== "string") return null;
  const slug = item.slug.trim();
  if (!slug || slug.length > 160) return null;
  const variantId = typeof item.variantId === "string"
    ? item.variantId.trim() || null
    : item.variantId === null || item.variantId === undefined
      ? null
      : undefined;
  if (variantId === undefined) return null;
  if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return null;
  return { slug, variantId, quantity: item.quantity };
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ successful: false, message: "مبدأ درخواست معتبر نیست." }, { status: 403, headers: headers() });
  }

  const rate = await consumeRateLimit({
    key: `coupon-preview:${requestIp(request)}`,
    limit: 20,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { successful: false, message: "تعداد بررسی کد تخفیف بیش از حد مجاز است." },
      { status: 429, headers: { ...headers(), "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    let raw: unknown;
    try {
      raw = await readJsonBody(request, 24 * 1024);
    } catch (error) {
      const bodyError = error instanceof JsonRequestBodyError ? error : null;
      return NextResponse.json(
        { successful: false, message: bodyError?.message ?? "اطلاعات کد تخفیف معتبر نیست." },
        { status: bodyError?.status ?? 400, headers: headers() },
      );
    }

    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return NextResponse.json({ successful: false, message: "اطلاعات کد تخفیف معتبر نیست." }, { status: 400, headers: headers() });
    }

    const body = raw as Record<string, unknown>;
    const code = normalizeCouponCode(body.code);
    if (!code) {
      return NextResponse.json({ successful: false, message: "کد تخفیف را وارد کنید." }, { status: 400, headers: headers() });
    }

    const mobile = normalizeCheckoutMobile(body.customerMobile);
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 30) {
      return NextResponse.json({ successful: false, message: "سبد خرید برای بررسی کد معتبر نیست." }, { status: 400, headers: headers() });
    }

    const items = body.items.map(normalizeItem);
    if (items.some(item => item === null)) {
      return NextResponse.json({ successful: false, message: "حداقل یکی از اقلام سبد معتبر نیست." }, { status: 400, headers: headers() });
    }

    const merged = new Map<string, ValidItem>();
    for (const item of items as ValidItem[]) {
      const key = `${item.slug}::${item.variantId ?? ""}`;
      const existing = merged.get(key);
      if (existing) {
        existing.quantity = Math.min(existing.quantity + item.quantity, 99);
      } else {
        merged.set(key, { ...item });
      }
    }

    let subtotalToman = 0n;
    for (const item of merged.values()) {
      const priced = await getProductLivePrice({ slug: item.slug, variantId: item.variantId });
      const stock = priced.variant?.stock ?? priced.product.stock;
      if (!priced.product.isPurchasable || stock < item.quantity) {
        return NextResponse.json({ successful: false, message: "موجودی سبد تغییر کرده است؛ ابتدا سبد را به‌روزرسانی کنید." }, { status: 409, headers: headers() });
      }
      subtotalToman += BigInt(priced.pricing.finalPriceToman) * BigInt(item.quantity);
    }

    const application = await previewCoupon({ code, subtotalToman, customerMobile: mobile });
    const shipping = calculateShipping(subtotalToman);
    const payableToman = subtotalToman + BigInt(shipping.shippingToman) - application.discountToman;

    return NextResponse.json(
      {
        successful: true,
        code: application.code,
        discountToman: application.discountToman.toString(),
        subtotalToman: subtotalToman.toString(),
        shippingToman: shipping.shippingToman,
        payableToman: (payableToman > 0n ? payableToman : 0n).toString(),
        message: `کد ${application.code} تأیید شد؛ ۵۰٬۰۰۰ تومان هدیه خرید اول اعمال می‌شود.`,
      },
      { status: 200, headers: headers() },
    );
  } catch (error) {
    if (error instanceof CouponValidationError || error instanceof CheckoutCustomerError) {
      return NextResponse.json({ successful: false, message: error.message }, { status: 400, headers: headers() });
    }
    if (error instanceof ProductPricingError) {
      return NextResponse.json({ successful: false, message: error.message }, { status: 409, headers: headers() });
    }
    console.error("[Eloria Coupon Preview] unexpected error", error);
    return NextResponse.json({ successful: false, message: "بررسی کد تخفیف در حال حاضر امکان‌پذیر نیست." }, { status: 503, headers: headers() });
  }
}
