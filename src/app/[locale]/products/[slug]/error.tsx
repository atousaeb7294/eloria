"use client";

import Link from "next/link";

import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import {
  useEffect,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  InternalPageShell,
} from "@/components/internal-page-shell";

type ProductErrorProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function ProductError({
  error,
  reset,
}: ProductErrorProps) {
  const params = useParams<{
    locale?: string;
  }>();
  const locale = params?.locale === "en" ? "en" : "fa";
  const isPersian = locale === "fa";

  useEffect(() => {
    console.error("Product page error", error);
  }, [error]);

  return (
    <InternalPageShell locale={locale}>
      <section className="relative z-10 mx-auto flex min-h-[78vh] w-full max-w-3xl items-center px-4 pb-24 pt-[130px] sm:px-6">
        <div className="relative w-full overflow-hidden rounded-[2.4rem] border border-rose-200/15 bg-[linear-gradient(145deg,rgba(47,13,18,0.82),rgba(3,24,17,0.96))] p-6 text-center shadow-[0_35px_100px_rgba(0,0,0,0.42)] sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-rose-200/20 bg-rose-300/[0.06] text-rose-100">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-rose-100/45">
            Eloria Product Error
          </p>

          <h1 className="mt-3 text-2xl font-semibold text-[#f5e8d2] sm:text-3xl">
            {isPersian ? "نمایش محصول با مشکل روبه‌رو شد" : "We could not display this product"}
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/58">
            {isPersian
              ? "ممکن است نرخ قیمت یا اطلاعات محصول موقتاً در دسترس نباشد. دوباره تلاش کنید یا به فهرست محصولات برگردید."
              : "The live price or product information may be temporarily unavailable. Try again or return to the catalog."}
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#e2c56f]/50 bg-[#d9b85f]/[0.09] px-6 text-sm text-[#f1dc9d] transition hover:border-[#f0d681]/80 hover:bg-[#d9b85f]/[0.14]"
            >
              <RefreshCw className="h-4 w-4" />
              {isPersian ? "تلاش دوباره" : "Try again"}
            </button>

            <Link
              href={`/${locale}/products`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-6 text-sm text-white/65 transition hover:border-white/20 hover:text-white"
            >
              {isPersian ? "بازگشت به محصولات" : "Back to products"}
            </Link>
          </div>
        </div>
      </section>
    </InternalPageShell>
  );
}
