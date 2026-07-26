"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const targetLocale = locale === "fa" ? "en" : "fa";
  const label = targetLocale === "fa" ? "فارسی" : "English";

  return (
    <Link
      href={pathname}
      locale={targetLocale}
      aria-label={`تغییر زبان به ${label}`}
      className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/50"
    >
      <Languages className="size-4" />
      <span>{label}</span>
    </Link>
  );
}