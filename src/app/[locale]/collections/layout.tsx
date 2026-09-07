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
    path: "/collections",
    title: locale === "fa" ? "گنجینه‌های جواهرات الوریا" : "Eloria Jewellery Collections",
    description:
      locale === "fa"
        ? "گنجینه‌های جواهرات الوریا را بر اساس روایت، طراحی و جنس اثر کشف کنید."
        : "Discover Eloria jewellery collections by story, design and material.",
  });
}

export default function CollectionsLayout({ children }: { children: ReactNode }) {
  return children;
}
