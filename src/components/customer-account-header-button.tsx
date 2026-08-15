"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";

export function CustomerAccountHeaderButton({ locale }: { locale: "fa" | "en" }) {
  return (
    <Link
      href={`/${locale}/profile`}
      aria-label={locale === "fa" ? "حساب مشتری" : "Customer account"}
      title={locale === "fa" ? "حساب من" : "My account"}
      className="group relative grid size-10 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 hover:border-[#dfbd68]/45 hover:bg-[#168461]/15 hover:text-[#f5dc9a] sm:size-11 sm:rounded-2xl"
    >
      <span aria-hidden="true" className="absolute inset-[3px] rounded-[9px] border border-dashed border-[#efd184]/20" />
      <UserRound className="relative z-10 h-[18px] w-[18px]" strokeWidth={1.6} />
    </Link>
  );
}
