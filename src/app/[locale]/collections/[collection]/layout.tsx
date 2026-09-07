import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getActiveCatalogCollections } from "@/lib/catalog";
import { localizedPageMetadata, type EloriaLocale } from "@/lib/seo";

function slugLabel(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; collection: string }>;
}): Promise<Metadata> {
  const { locale, collection } = await params;
  if (locale !== "fa" && locale !== "en") return {};

  const collections = await getActiveCatalogCollections().catch(() => []);
  const record = collections.find(item => item.slug === collection);
  const name =
    locale === "fa"
      ? record?.nameFa || slugLabel(collection)
      : record?.nameEn || slugLabel(collection);

  return localizedPageMetadata({
    locale: locale as EloriaLocale,
    path: `/collections/${encodeURIComponent(collection)}`,
    title:
      locale === "fa"
        ? `گنجینه ${name} | الوریا`
        : `${name} Collection | Eloria`,
    description:
      locale === "fa"
        ? `آثار گنجینه ${name} الوریا را در نسخه‌های طلا و نقره مشاهده کنید.`
        : `Explore the ${name} collection from Eloria in gold and silver.`,
  });
}

export default function CollectionSlugLayout({ children }: { children: ReactNode }) {
  return children;
}
