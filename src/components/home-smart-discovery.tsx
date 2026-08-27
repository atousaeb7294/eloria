"use client";

import { ArrowUpLeft, Search, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { recordClientMeasurement } from "@/lib/site-measurement-client";

const FA_SUGGESTIONS = [
  "دستبند ظریف",
  "گردنبند طلا زیر ۳۰ میلیون",
  "هدیه مینیمال",
  "سنگ سبز",
];

const EN_SUGGESTIONS = [
  "delicate bracelet",
  "gold necklace under 30 million",
  "minimal gift",
  "green stone",
];

export function HomeSmartDiscovery({ locale }: { locale: string }) {
  const isPersian = locale === "fa";
  const router = useRouter();
  const pathname = usePathname() ?? `/${locale}`;
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");

  const suggestions = useMemo(
    () => (isPersian ? FA_SUGGESTIONS : EN_SUGGESTIONS),
    [isPersian],
  );

  const openQuery = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;

    recordClientMeasurement({
      event_type: "search",
      locale: isPersian ? "fa" : "en",
      path: pathname,
    });

    router.push(`/${locale}/products?q=${encodeURIComponent(normalized)}`);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openQuery(query);
  };

  return (
    <section
      dir={isPersian ? "rtl" : "ltr"}
      aria-labelledby="eloria-smart-discovery-title"
      className="eloria-home-lazy-section relative mx-auto w-full max-w-6xl overflow-hidden px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-22"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(231,199,109,.3),transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[46%] h-48 w-[72%] -translate-x-1/2 rounded-full bg-[#0c7f59]/[.08] blur-[90px]" />

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.28 }}
        transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex items-center justify-center gap-3 text-[#dfc36f]/70">
            <span className="h-px w-10 bg-current/40" />
            <Sparkles className="size-3.5" />
            <span className="text-[9px] font-semibold tracking-[.24em]">DISCOVER ELORIA</span>
            <span className="h-px w-10 bg-current/40" />
          </div>
          <h2 id="eloria-smart-discovery-title" className={isPersian ? "font-persian-title mt-4 text-2xl text-[#f4e8cd] sm:text-3xl" : "mt-4 font-serif text-3xl text-[#f4e8cd] sm:text-4xl"}>
            {isPersian ? "آنچه در ذهن دارید، جست‌وجو کنید" : "Search the idea already in your mind"}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-xs leading-7 text-[#c9bb9a]/58 sm:text-[13px]">
            {isPersian
              ? "نام، جنس، رنگ یا بودجه‌ای که در ذهن دارید بنویسید؛ اثر مناسب شما نزدیک‌تر از آن است که فکر می‌کنید."
              : "Describe the piece, material, color, or budget you have in mind—and discover an Eloria creation made for you."}
          </p>
        </div>

        <form onSubmit={submit} className="mx-auto mt-8 max-w-3xl">
          <div className="group relative overflow-hidden rounded-full border border-[#e4c975]/22 bg-[linear-gradient(120deg,rgba(7,38,28,.88),rgba(2,20,14,.94))] p-1.5 shadow-[0_24px_70px_rgba(0,0,0,.26)] transition focus-within:border-[#ead17e]/52 focus-within:shadow-[0_26px_76px_rgba(0,0,0,.34),0_0_28px_rgba(224,193,103,.06)]">
            <Search className="pointer-events-none absolute start-5 top-1/2 size-4 -translate-y-1/2 text-[#dbc476]/58" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => router.prefetch(`/${locale}/products`)}
              placeholder={isPersian ? "مثلاً: دستبند ظریف با سنگ سبز" : "e.g. delicate bracelet with green stone"}
              className="h-12 w-full rounded-full bg-transparent pe-28 ps-12 text-sm text-[#f3e6ca] outline-none placeholder:text-[#b9aa89]/34 sm:h-14 sm:pe-36"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="absolute end-1.5 top-1/2 inline-flex h-9 -translate-y-1/2 items-center gap-2 rounded-full border border-[#e6ca76]/32 bg-[#d7b85e]/[.09] px-4 text-[10px] font-medium text-[#f0d98f] transition hover:border-[#f0d784]/68 hover:bg-[#d7b85e]/[.14] disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:px-5 sm:text-[11px]"
            >
              {isPersian ? "جست‌وجو" : "Search"}
              <ArrowUpLeft className="size-3.5" />
            </button>
          </div>
        </form>

        <div className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuery(suggestion);
                openQuery(suggestion);
              }}
              whileHover={reducedMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.2 }}
              className="rounded-full border border-white/[.07] bg-white/[.025] px-3.5 py-2 text-[10px] text-[#d9c9a6]/58 transition-colors hover:border-[#dfc36f]/25 hover:text-[#ead697]/82"
              style={{ transitionDelay: `${index * 12}ms` }}
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
