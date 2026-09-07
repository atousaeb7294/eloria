"use client";

import { Languages } from "lucide-react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

type LocaleSwitcherProps = {
  locale?: string;
};

export function LocaleSwitcher({
  locale,
}: LocaleSwitcherProps = {}) {
  const pathname =
    usePathname() ?? "/fa";

  const router =
    useRouter();

  const pathnameLocale =
    pathname.match(
      /^\/(fa|en)(?=\/|$)/,
    )?.[1];

  const resolvedLocale =
    locale === "en" ||
    locale === "fa"
      ? locale
      : pathnameLocale === "en"
        ? "en"
        : "fa";

  const targetLocale =
    resolvedLocale === "fa"
      ? "en"
      : "fa";

  const label =
    targetLocale === "fa"
      ? "فارسی"
      : "English";

  const ariaLabel =
    resolvedLocale === "fa"
      ? `تغییر زبان به ${label}`
      : `Switch language to ${label}`;

  const switchLocale = () => {
    const localizedPath =
      /^\/(fa|en)(?=\/|$)/.test(
        pathname,
      )
        ? pathname.replace(
            /^\/(fa|en)(?=\/|$)/,
            `/${targetLocale}`,
          )
        : `/${targetLocale}${
            pathname.startsWith("/")
              ? pathname
              : `/${pathname}`
          }`;

    const search =
      window.location.search;

    const hash =
      window.location.hash;

    router.replace(
      `${localizedPath}${search}${hash}`,
      {
        scroll: false,
      },
    );
  };

  return (
    <button
      type="button"
      onClick={switchLocale}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex size-10 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.045] text-[#f4dfaa] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-[#e5c873]/55 hover:bg-[#168461]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0d587]/70 sm:h-11 sm:w-auto sm:min-w-24 sm:px-3"
    >
      <Languages
        className="size-[18px]"
        aria-hidden="true"
      />
      <span className="hidden text-xs font-medium sm:inline">
        {label}
      </span>
    </button>
  );
}
