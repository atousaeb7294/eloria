"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const targetLocale = locale === "fa" ? "en" : "fa";
  const label = targetLocale === "fa" ? "فارسی" : "English";
  const ariaLabel =
    locale === "fa"
      ? `تغییر زبان به ${label}`
      : `Switch language to ${label}`;

  const switchLocale = () => {
    const search = window.location.search;

    router.replace(`${pathname}${search}`, {
      locale: targetLocale,
      scroll: false,
    });
  };

  return (
    <button
      type="button"
      onClick={switchLocale}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex size-10 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.045] text-[#f4dfaa] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-[#e5c873]/55 hover:bg-[#168461]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0d587]/70 sm:h-11 sm:w-auto sm:min-w-24 sm:px-3"
    >
      <Languages className="size-[18px]" aria-hidden="true" />
      <span className="hidden text-xs font-medium sm:inline">{label}</span>
    </button>
  );
}
