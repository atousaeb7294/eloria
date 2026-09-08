import type { ReactNode } from "react";
import type { Metadata } from "next";

import { localizedPageMetadata, type EloriaLocale } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") return {};

  return localizedPageMetadata({
    locale: locale as EloriaLocale,
    path: "/about",
    title:
      locale === "fa"
        ? "درباره الوریا | زیورآلات دست‌ساز مکرومه"
        : "About Eloria | Handmade Macramé Jewelry",
    description:
      locale === "fa"
        ? "آشنایی رسمی با الوریا، زیورآلات دست‌ساز مکرومه، طلا، نقره و سنگ‌های زینتی."
        : "The official introduction to Eloria handmade macramé, gold, silver and gemstone jewelry.",
    image: "/images/hero/eloria-hero.webp",
  });
}

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
