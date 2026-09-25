"use client";
import { formatStoredWeight, type WeightUnits } from "@/lib/weight-units";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RawGoldPrice } from "@/components/raw-gold-price";
import { AddToCartButton } from "@/components/add-to-cart-button";
import type { ProductPriceResult } from "@/lib/product-pricing";

/** All numbers, variant selection and sale eligibility come from the same strict
 * server quote. Never recompute the metal formula in the browser. */
export function LivePurchaseBox({
  locale,
  slug,
  variantId,
  initial = null,
  weightUnits,
}: {
  weightUnits?: WeightUnits;
  locale: string;
  slug: string;
  variantId?: string | null;
  initial?: ProductPriceResult | null;
}) {
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
        const query = variantId
          ? `?variantId=${encodeURIComponent(variantId)}`
          : "";
        const response = await fetch(
          `/api/products/${encodeURIComponent(slug)}/price${query}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = (await response.json()) as ProductPriceResult & {
          successful?: boolean;
        };
        if (!response.ok || !result.successful)
          throw new Error("quote unavailable");
        if (!disposed) {
          setQuote(result);
          setError(false);
          setChecked(true);
          setUpdated(new Date().toLocaleTimeString(fa ? "fa-IR" : "en-GB"));
        }
      } catch {
        if (!disposed) {
          setError(true);
          setChecked(false);
        }
      } finally {
        clearTimeout(timeout);
        busy = false;
      }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30000);
    const resume = () => void refresh();
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [slug, variantId, fa]);

  const format = (value: string) => {
    try {
      return BigInt(value).toLocaleString(fa ? "fa-IR" : "en-US");
    } catch {
      return "—";
    }
  };
  const b = quote?.pricing.breakdown;
  const stock = quote?.variant?.stock ?? quote?.product.stock ?? 0;
  const purchasable =
    checked &&
    !error &&
    !!quote?.product.isPurchasable &&
    (!quote.liveRate || quote.liveRate.isUsableForSale);
  const weight =
    quote?.variant?.weightGrams ?? b?.weightGrams ?? quote?.product.weightGrams;
  const hasGold =
    quote?.product.metalComponents?.hasGold ??
    quote?.product.material === "GOLD";
  const hasSilver =
    quote?.product.metalComponents?.hasSilver ??
    quote?.product.material === "SILVER";
  return (
    <section
      className="eloria-live-purchase"
      aria-label={fa ? "مشخصات محصول و خرید" : "Product details and purchase"}
    >
      <div className="flex items-center justify-between gap-3">
        <h3>{fa ? "مشخصات محصول" : "Product details"}</h3>
        <span className="text-[10px] opacity-70">
          {updated
            ? `${fa ? "به‌روز در" : "Updated"} ${updated}`
            : fa
              ? "در حال بررسی"
              : "Checking"}
        </span>
      </div>
      <RawGoldPrice locale={locale} />
      {quote ? (
        <>
          <p className="mt-4 text-xs opacity-75">
            {fa ? "قیمت محصول" : "Product price"}
          </p>
          <p className="mb-4 mt-2 text-2xl text-[#f1d99c]" aria-live="polite">
            {format(quote.pricing.finalPriceToman)}{" "}
            <small className="text-xs">{fa ? "تومان" : "toman"}</small>
          </p>
          <div className="mb-4 rounded-2xl border border-[#ddc48b]/20 bg-[#ddc48b]/5 p-4 text-xs">
            <dl className="space-y-3">
              <div className="flex justify-between gap-4">
                <dt>{fa ? "وزن محصول" : "Product weight"}</dt>
                <dd>
                  {weight !== null && weight !== undefined
                    ? formatStoredWeight(weight, weightUnits?.metalWeight ?? "gram", locale)
                    : fa
                      ? "ثبت نشده"
                      : "Not specified"}
                </dd>
              </div>
              {b?.components &&
                b.components.length > 1 &&
                b.components.map((part) => (
                  <div
                    key={part.material}
                    className="flex justify-between gap-4"
                  >
                    <dt>
                      {part.material === "GOLD"
                        ? fa
                          ? "وزن طلا"
                          : "Gold weight"
                        : fa
                          ? "وزن نقره"
                          : "Silver weight"}
                    </dt>
                    <dd>
                      {formatStoredWeight(part.weightGrams, (part.material === "GOLD" ? weightUnits?.goldComponentWeight : weightUnits?.silverComponentWeight) ?? "gram", locale)}
                    </dd>
                  </div>
                ))}
            </dl>
            <p className="mt-4 leading-7 text-[#ead9b3]">
              {quote.pricing.mode === "MANUAL"
                ? fa
                  ? "قیمت نمایش‌داده‌شده، قیمت نهایی ثبت‌شده برای این اثر است."
                  : "The displayed price is the final listed price for this creation."
                : hasGold
                  ? fa
                    ? `قیمت نهایی این اثر شامل ارزش طلای به‌کاررفته${hasSilver ? " و نقره" : ""}، اجرت ساخت طلا، سود فروشنده و ارزش هنر دست است.`
                    : `The final price includes the value of gold${hasSilver ? " and silver" : ""}, gold making charges, the seller’s profit and the value of handcraft.`
                  : hasSilver
                    ? fa
                      ? "قیمت نهایی این اثر شامل ارزش نقره، اجرت ساخت نقره، سود فروشنده و ارزش هنر دست است."
                      : "The final price includes silver, silver making charges, the seller’s profit and the value of handcraft."
                    : fa
                      ? "قیمت نهایی این اثر بر پایهٔ مواد به‌کاررفته و ارزش هنر دست تعیین می‌شود."
                      : "The final price reflects the materials and the value of handcraft."}
            </p>
            {b && (
              <p className="mt-2 leading-7 opacity-75">
                {fa ? "مالیات: " : "Tax: "}
                {format(b.taxToman)} {fa ? "تومان" : "toman"}
                {BigInt(b.taxToman) > 0n &&
                  (fa ? "؛ در قیمت نهایی لحاظ شده است." : "; included in the final price.")}
              </p>
            )}
          </div>
          {quote.variant && (
            <p className="mb-3 text-xs">
              {fa ? quote.variant.titleFa : quote.variant.titleEn}
            </p>
          )}
        </>
      ) : null}
      {error && (
        <p role="status" className="mb-4 text-xs leading-7 text-amber-100">
          {fa
            ? "قیمت تازه دریافت نشد. خرید پس از بررسی دوبارهٔ نرخ فعال می‌شود."
            : "The latest price is unavailable. Purchase resumes after the rate is checked."}
        </p>
      )}
      {quote && stock <= 0 ? (
        <Link
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-[#ead18a] bg-[linear-gradient(135deg,#b49445,#efd58b)] px-5 py-3 text-center text-sm font-semibold text-[#10251c] shadow-[0_4px_16px_rgba(207,180,95,0.15)] transition-[filter,box-shadow] duration-150 hover:brightness-110 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6e8c6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#031a13]"
          href={`/${locale}/preorder/${slug}`}
        >
          {fa ? "ثبت درخواست پیش‌سفارش" : "Request a preorder"}
        </Link>
      ) : (
        <AddToCartButton
          locale={locale}
          slug={slug}
          variantId={quote?.variant?.id ?? variantId}
          maxQuantity={stock}
          disabled={!purchasable}
        />
      )}
      <p className="mt-3 text-[10px] leading-6 opacity-60">
        {fa
          ? "قیمت پیش از رفتن به درگاه دوباره بررسی می‌شود."
          : "Your price is checked again before opening payment."}
      </p>
    </section>
  );
}
