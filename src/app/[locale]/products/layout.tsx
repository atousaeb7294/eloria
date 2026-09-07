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
    path: "/products",
    title: locale === "fa" ? "تمام جواهرات و آثار الوریا" : "All Eloria Jewellery",
    description:
      locale === "fa"
        ? "تمام آثار الوریا را بر اساس گنجینه، جنس، موجودی و بازه قیمت مشاهده و فیلتر کنید."
        : "Browse all Eloria creations and filter by collection, material, availability and price.",
  });
}

export default function ProductsLayout({ children }: { children: ReactNode }) {
  return children;
}
