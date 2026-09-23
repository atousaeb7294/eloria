"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { DELIVERY_TOMAN } from "@/lib/commerce-policy";
import type { ProductPriceResult } from "@/lib/product-pricing";

/** All numbers, variant selection and sale eligibility come from the same strict
 * server quote. Never recompute the metal formula in the browser. */
export function LivePurchaseBox({ locale, slug, variantId, initial = null }: { locale: string; slug: string; variantId?: string | null; initial?: ProductPriceResult | null }) {
  const fa = locale === "fa";
  const [quote, setQuote] = useState(initial);
  const [error, setError] = useState(false);
  const [checked, setChecked] = useState(false);
  const [updated, setUpdated] = useState("");
  useEffect(() => {
    let controller: AbortController | null = null;
    let busy = false;
    let disposed = false;
    async function refresh() {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 12000);
      try {
        const query = variantId ? `?variantId=${encodeURIComponent(variantId)}` : "";
        const response = await fetch(`/api/products/${encodeURIComponent(slug)}/price${query}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json() as ProductPriceResult & { successful?: boolean };
        if (!response.ok || !result.successful) throw new Error("quote unavailable");
        if (!disposed) { setQuote(result); setError(false); setChecked(true); setUpdated(new Date().toLocaleTimeString(fa ? "fa-IR" : "en-GB")); }
      } catch { if (!disposed) { setError(true); setChecked(false); } }
      finally { clearTimeout(timeout); busy = false; }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30000);
    const resume = () => void refresh();
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => { disposed = true; controller?.abort(); clearInterval(interval); window.removeEventListener("focus", resume); window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", resume); };
  }, [slug, variantId, fa]);

  const format = (value: string) => { try { return BigInt(value).toLocaleString(fa ? "fa-IR" : "en-US"); } catch { return "—"; } };
  const b = quote?.pricing.breakdown;
  const stock = quote?.variant?.stock ?? quote?.product.stock ?? 0;
  const purchasable = checked && !error && !!quote?.product.isPurchasable && (!quote.liveRate || quote.liveRate.isUsableForSale);
  const rows: Array<[string, string | undefined]> = b ? [
    [fa ? "ارزش فلز" : "Metal value", b.metalValueToman],
    [fa ? "اجرت ساخت" : "Making charge", b.makingChargeTotalToman],
    [fa ? "سود فروش" : "Retail profit", b.profitToman],
    [fa ? "هنر دست" : "Handwork", b.artisticFeeToman],
    [fa ? "بسته‌بندی" : "Packaging", b.packagingToman],
    [fa ? "مالیات" : "Tax", b.taxToman],
  ] : [];
  return <section className="eloria-live-purchase" aria-label={fa ? "حسابرسی قیمت و خرید" : "Price breakdown and purchase"}>
    <div className="flex items-center justify-between gap-3"><h3>{fa ? "قیمت این اثر" : "Your creation"}</h3><span className="text-[10px] opacity-70">{updated ? `${fa ? "به‌روز در" : "Updated"} ${updated}` : fa ? "در حال بررسی" : "Checking"}</span></div>
    {quote ? <>
      <p className="my-4 text-2xl text-[#f1d99c]" aria-live="polite">{format(quote.pricing.finalPriceToman)} <small className="text-xs">{fa ? "تومان" : "toman"}</small></p>
      <details className="mb-4 text-xs"><summary className="cursor-pointer py-2">{fa ? "ریز محاسبهٔ قیمت" : "Price breakdown"}</summary>
        <dl className="space-y-2 py-3">{rows.map(([label, value]) => value !== undefined ? <div key={label} className="flex justify-between gap-4"><dt>{label}</dt><dd>{format(value)} {fa ? "تومان" : "toman"}</dd></div> : null)}</dl>
        {b?.components?.map(part => <p key={part.material} className="text-[11px] leading-7">{part.material === "GOLD" ? fa ? "طلا" : "Gold" : fa ? "نقره" : "Silver"}: {part.weightGrams} {fa ? "گرم" : "g"} · {format(part.metalValueToman)} {fa ? "تومان" : "toman"}</p>)}
        {!b && <p className="leading-7">{fa ? "قیمت ثبت‌شدهٔ اثر به‌همراه بسته‌بندی." : "The listed creation price includes packaging."}</p>}
        <p className="mt-3 leading-7">{fa ? "ارسال کل سفارش: " : "Order delivery: "}{format(DELIVERY_TOMAN.toString())} {fa ? "تومان" : "toman"}</p>
        <p className="mt-3 leading-7 opacity-75">{fa ? "ارسال، یک‌بار برای کل سفارش در سبد خرید اضافه می‌شود. در بازار بسته افزایش نرخ نداریم." : "Delivery is added once per order in your bag. Closed-market rates carry no extra markup."}</p>
      </details>
      {quote.variant && <p className="mb-3 text-xs">{fa ? quote.variant.titleFa : quote.variant.titleEn}</p>}
    </> : null}
    {error && <p role="status" className="mb-4 text-xs leading-7 text-amber-100">{fa ? "قیمت تازه دریافت نشد. خرید پس از بررسی دوبارهٔ نرخ فعال می‌شود." : "The latest price is unavailable. Purchase resumes after the rate is checked."}</p>}
    {quote && stock <= 0 ? <Link className="block py-4 text-center" href={`/${locale}/preorder/${slug}`}>{fa ? "پیش‌سفارش" : "Preorder"}</Link> : <AddToCartButton locale={locale} slug={slug} variantId={quote?.variant?.id ?? variantId} maxQuantity={stock} disabled={!purchasable} />}
    <p className="mt-3 text-[10px] leading-6 opacity-60">{fa ? "قیمت پیش از رفتن به درگاه دوباره بررسی می‌شود." : "Your price is checked again before opening payment."}</p>
  </section>;
}
