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
    title: locale === "fa" ? "داستان و هویت الوریا" : "The Story of Eloria",
    description:
      locale === "fa"
        ? "با داستان، ارزش‌ها و نگاه طراحی جواهرات الوریا آشنا شوید؛ روایتی الهام‌گرفته از شکوه ایران کهن."
        : "Discover Eloria’s story, values and jewellery design philosophy inspired by the splendour of ancient Persia.",
    image: "/images/hero/eloria-hero.jpeg",
  });
}

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
