"use client";

import { Sparkles } from "lucide-react";

export function SmartSelectionTrigger({ locale, compact = false }: { locale: "fa" | "en"; compact?: boolean }) {
  const fa = locale === "fa";
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("eloria-open-selection"))}
      className={compact ? "inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d9b85f]/28 bg-[#d9b85f]/[.055] px-4 text-xs text-[#ead38d] transition hover:border-[#edd17b]/60 hover:bg-[#d9b85f]/[.11]" : "group inline-flex min-h-12 items-center gap-2 rounded-full border border-[#d9b85f]/32 bg-[#d9b85f]/[.07] px-5 text-sm text-[#f0d792] transition hover:-translate-y-0.5 hover:border-[#efd27c]/64 hover:bg-[#d9b85f]/[.12]"}
    >
      <Sparkles className="size-4 transition group-hover:rotate-12" />
      {fa ? "راهنمای انتخاب" : "Selection guide"}
    </button>
  );
}
