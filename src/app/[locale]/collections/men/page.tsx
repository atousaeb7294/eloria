import type { Metadata } from "next";
import ProductsPage from "../../products/page";
import { localizedPageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") return {};
  const raw = await searchParams;
  return { ...localizedPageMetadata({ locale, path: "/collections/men",
    title: locale === "fa" ? "گنجینهٔ آقایان | الوریا" : "Men’s Treasury | Eloria",
    description: locale === "fa" ? "زیورآلات مناسب آقایان را با روایت‌های اختصاصی شخصیت‌های مرد جهان الوریا کشف کنید." : "Discover jewellery for men with exclusive stories from Eloria’s male characters." }),
    ...(Object.values(raw).some(Boolean) ? { robots: { index: false, follow: true } } : {}),
  };
}
export default async function MenPage({ params, searchParams }: Props) {
  return <ProductsPage params={params} searchParams={Promise.resolve({ ...await searchParams, collection: "men" })} />;
}
