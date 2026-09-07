"use client";

import {
  useParams,
} from "next/navigation";

import {
  InternalPageShell,
} from "@/components/internal-page-shell";

export default function ProductLoading() {
  const params = useParams<{
    locale?: string;
  }>();
  const locale = params?.locale === "en" ? "en" : "fa";
  const isPersian = locale === "fa";

  return (
    <InternalPageShell locale={locale}>
      <section
        aria-busy="true"
        aria-label={isPersian ? "در حال بارگذاری محصول" : "Loading product"}
        className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-28 pt-[130px] sm:px-6 sm:pt-[142px] lg:px-10"
      >
        <div className="h-12 w-52 animate-pulse rounded-full border border-white/10 bg-white/[0.035]" />

        <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
          <div className="overflow-hidden rounded-[2.5rem] border border-[#d8b860]/15 bg-[#041c14]/85 p-3">
            <div className="aspect-[4/5] animate-pulse rounded-[2rem] bg-white/[0.045]" />
            <div className="mt-3 flex gap-2">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-20 w-16 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.035] sm:h-24 sm:w-20"
                />
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[2.2rem] border border-white/[0.07] bg-[#041c14]/85 p-6">
              <div className="h-11 w-11 animate-pulse rounded-xl bg-white/[0.055]" />
              <div className="mt-6 h-10 w-3/4 animate-pulse rounded-xl bg-white/[0.06]" />
              <div className="mt-3 h-4 w-1/2 animate-pulse rounded-lg bg-white/[0.04]" />
              <div className="mt-7 h-36 animate-pulse rounded-[1.8rem] bg-white/[0.045]" />
              <div className="mt-5 h-14 animate-pulse rounded-full bg-white/[0.05]" />
            </div>

            <div className="h-40 animate-pulse rounded-[2rem] border border-white/[0.07] bg-[#041c14]/80" />
            <div className="h-52 animate-pulse rounded-[2rem] border border-white/[0.07] bg-[#041c14]/80" />
          </div>
        </div>
      </section>
    </InternalPageShell>
  );
}
