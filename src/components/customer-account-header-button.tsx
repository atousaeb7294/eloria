"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";

export function CustomerAccountHeaderButton({ locale }: { locale: "fa" | "en" }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/customer/me", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(response => setSignedIn(response.ok))
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  const label = signedIn
    ? locale === "fa" ? "حساب من" : "My account"
    : locale === "fa" ? "ورود / عضویت" : "Sign in / Join";

  return (
    <Link
      href={signedIn ? `/${locale}/profile` : `/${locale}/login`}
      aria-label={label}
      title={label}
      className="group relative flex h-10 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] px-2.5 text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 hover:border-[#dfbd68]/45 hover:bg-[#168461]/15 hover:text-[#f5dc9a] sm:h-11 sm:rounded-2xl sm:px-3"
    >
      <span aria-hidden="true" className="absolute inset-[3px] rounded-[9px] border border-dashed border-[#efd184]/20" />
      <UserRound className="relative z-10 h-[18px] w-[18px]" strokeWidth={1.6} />
      <span className="relative z-10 inline whitespace-nowrap text-[10px] font-medium sm:text-[11px]">
        {label}
      </span>
    </Link>
  );
}
