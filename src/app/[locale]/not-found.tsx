"use client";

import Link from "next/link";

import {
  SearchX,
} from "lucide-react";

import {
  useParams,
} from "next/navigation";

import {
  InternalPageShell,
} from "@/components/internal-page-shell";

export default function LocaleNotFound() {
  const params = useParams<{
    locale?: string;
  }>();
  const locale = params?.locale === "en" ? "en" : "fa";
  const isPersian = locale === "fa";

  return (
    <InternalPageShell locale={locale}>
      <section className="relative z-10 mx-auto flex min-h-[78vh] w-full max-w-3xl items-center px-4 pb-24 pt-[130px] sm:px-6">
        <div className="relative w-full overflow-hidden rounded-[2.4rem] border border-[#d9b85f]/20 bg-[linear-gradient(145deg,rgba(8,39,29,0.92),rgba(2,19,14,0.98))] p-7 text-center shadow-[0_35px_100px_rgba(0,0,0,0.42)] sm:p-11">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#dfc36f]/30 bg-[#d9b85f]/[0.06] text-[#ead07d]">
            <SearchX className="h-8 w-8" />
          </div>

          <p className="mt-6 text-[10px] uppercase tracking-[0.34em] text-[#d4bd7a]/50">
            Eloria 404
          </p>

          <h1 className="mt-3 text-2xl font-semibold text-[#f5e8d2] sm:text-3xl">
            {isPersian ? "این صفحه در گنجینه پیدا نشد" : "This page was not found in the collection"}
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#d7c9aa]/65">
            {isPersian
              ? "ممکن است محصول حذف شده باشد، آدرس تغییر کرده باشد یا لینک واردشده کامل نباشد."
              : "The product may have been removed, the address may have changed, or the link may be incomplete."}
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/${locale}/products`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#e2c56f]/50 bg-[#d9b85f]/[0.09] px-6 text-sm text-[#f1dc9d] transition hover:border-[#f0d681]/80 hover:bg-[#d9b85f]/[0.14]"
            >
              {isPersian ? "مشاهده محصولات" : "View products"}
            </Link>

            <Link
              href={`/${locale}#hero`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-6 text-sm text-white/65 transition hover:border-white/20 hover:text-white"
            >
              {isPersian ? "صفحه اصلی" : "Home"}
            </Link>
          </div>
        </div>
      </section>
    </InternalPageShell>
  );
}
