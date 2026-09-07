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
  params: Promise<{ locale: string; collection: string; material: string }>;
}): Promise<Metadata> {
  const { locale, collection, material } = await params;
  if (
    (locale !== "fa" && locale !== "en") ||
    (material !== "gold" && material !== "silver")
  ) {
    return {};
  }

  const collections = await getActiveCatalogCollections().catch(() => []);
  const record = collections.find(item => item.slug === collection);
  const collectionName =
    locale === "fa"
      ? record?.nameFa || slugLabel(collection)
      : record?.nameEn || slugLabel(collection);

  const materialName =
    locale === "fa"
      ? material === "gold"
        ? "طلا"
        : "نقره"
      : material === "gold"
        ? "Gold"
        : "Silver";

  return localizedPageMetadata({
    locale: locale as EloriaLocale,
    path: `/collections/${encodeURIComponent(collection)}/${material}`,
    title:
      locale === "fa"
        ? `${collectionName} ${materialName} | الوریا`
        : `${materialName} ${collectionName} | Eloria`,
    description:
      locale === "fa"
        ? `آثار ${materialName} گنجینه ${collectionName} الوریا را مشاهده کنید.`
        : `Browse ${materialName.toLowerCase()} pieces from the ${collectionName} collection.`,
  });
}

export default function MaterialCollectionLayout({ children }: { children: ReactNode }) {
  return children;
}
