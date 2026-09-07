"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  AlertTriangle,
  Home,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";

import {
  InternalPageShell,
} from "@/components/internal-page-shell";

type CommerceRouteErrorProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
  section: "products" | "cart" | "checkout";
};

export function CommerceRouteError({
  error,
  reset,
  section,
}: CommerceRouteErrorProps) {
  const pathname =
    usePathname();

  const pathLocale =
    pathname.startsWith("/en")
      ? "en"
      : "fa";

  const isPersian =
    pathLocale === "fa";

  const sectionName =
    section === "products"
      ? isPersian
        ? "محصولات"
        : "products"
      : section === "cart"
        ? isPersian
          ? "سبد خرید"
          : "shopping bag"
        : isPersian
          ? "تکمیل سفارش"
          : "checkout";

  const title =
    isPersian
      ? `نمایش ${sectionName} با مشکل روبه‌رو شد`
      : `The ${sectionName} could not be displayed`;

  const description =
    isPersian
      ? "اتصال یا اطلاعات این صفحه در دسترس نیست. دوباره تلاش کنید؛ اقلام ذخیره‌شده در سبد خرید حذف نمی‌شوند."
      : "The connection or page data is unavailable. Try again; saved shopping bag items will not be removed.";

  const secondaryHref =
    section === "products"
      ? `/${pathLocale}#hero`
      : `/${pathLocale}/products`;

  const secondaryLabel =
    section === "products"
      ? isPersian
        ? "بازگشت به خانه"
        : "Back to home"
      : isPersian
        ? "مشاهده محصولات"
        : "View products";

  return (
    <InternalPageShell locale={pathLocale}>
      <section className="relative z-10 mx-auto flex min-h-[78vh] w-full max-w-3xl items-center px-4 pb-24 pt-[132px] sm:px-6 sm:pt-[154px]">
        <div className="relative w-full overflow-hidden rounded-[2.35rem] border border-rose-200/18 bg-[linear-gradient(145deg,rgba(38,15,19,0.82),rgba(3,29,21,0.96)_58%,rgba(1,17,12,0.99))] px-6 py-11 text-center shadow-[0_38px_110px_rgba(0,0,0,0.48)] sm:px-11 sm:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-14 top-0 h-px bg-gradient-to-r from-transparent via-rose-100/55 to-transparent"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -end-24 -top-28 size-64 rounded-full bg-rose-300/[0.055] blur-[70px]"
          />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-rose-200/25 bg-rose-200/[0.065] text-rose-100/82 shadow-[0_0_34px_rgba(251,113,133,0.08)]">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <p className="mt-5 text-[10px] uppercase tracking-[0.28em] text-rose-100/38">
            ELORIA · SERVICE NOTICE
          </p>

          <h1 className="mt-3 text-2xl font-semibold text-[#f5e6c5] sm:text-3xl">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-8 text-[#d5c7a8]/68">
            {description}
          </p>

          {error.digest && (
            <p
              dir="ltr"
              className="mt-3 text-[10px] text-white/28"
            >
              Error ID: {error.digest}
            </p>
          )}

          <div className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={reset}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d9b85f]/45 bg-[#d9b85f]/[0.09] px-5 text-sm text-[#f1d98e] transition hover:-translate-y-0.5 hover:border-[#efd27c]/75 hover:bg-[#d9b85f]/[0.13]"
            >
              <RefreshCw className="h-4 w-4" />
              {isPersian
                ? "تلاش دوباره"
                : "Try again"}
            </button>

            <Link
              href={secondaryHref}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.025] px-5 text-sm text-white/64 transition hover:-translate-y-0.5 hover:border-[#d9b85f]/25 hover:text-[#efd98e]"
            >
              {section === "products" ? (
                <Home className="h-4 w-4" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </section>
    </InternalPageShell>
  );
}
