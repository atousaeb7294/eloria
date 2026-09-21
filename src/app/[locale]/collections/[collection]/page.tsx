import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import ProductsPage from "../../products/page";
import { localizedPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string; collection: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TREASURIES = {
  gold: { fa: "گنجینهٔ طلا | الوریا", en: "Gold Treasury | Eloria", faDescription: "همهٔ آثار طلای الوریا و آثار ترکیبی دارای طلا.", enDescription: "Every Eloria creation made with gold, including mixed-metal pieces." },
  silver: { fa: "گنجینهٔ نقره | الوریا", en: "Silver Treasury | Eloria", faDescription: "همهٔ آثار نقرهٔ الوریا و آثار ترکیبی دارای نقره.", enDescription: "Every Eloria creation made with silver, including mixed-metal pieces." },
  weave: { fa: "گنجینهٔ بافت | الوریا", en: "Woven Treasury | Eloria", faDescription: "آثار بافت‌محور الوریا، بدون طلا و نقره.", enDescription: "Eloria’s woven creations without gold or silver." },
} as const;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, collection } = await params;
  if ((locale !== "fa" && locale !== "en") || !(collection in TREASURIES)) return {};
  const treasury = TREASURIES[collection as keyof typeof TREASURIES];
  const raw = await searchParams;
  return {
    ...localizedPageMetadata({ locale, path: `/collections/${collection}`, title: locale === "fa" ? treasury.fa : treasury.en, description: locale === "fa" ? treasury.faDescription : treasury.enDescription }),
    ...(Object.values(raw).some(Boolean) ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { locale, collection } = await params;
  if ((locale !== "fa" && locale !== "en") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(collection)) notFound();
  if (collection === "gold" || collection === "silver" || collection === "weave") {
    return <ProductsPage params={Promise.resolve({ locale })} searchParams={Promise.resolve({ ...await searchParams, material: collection, treasury: collection })} />;
  }
  redirect(`/${locale}/products?collection=${encodeURIComponent(collection)}`);
}
