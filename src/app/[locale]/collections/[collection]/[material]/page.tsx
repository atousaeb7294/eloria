import { notFound, redirect } from "next/navigation";

export default async function LegacyMaterialCollectionPage({ params }: { params: Promise<{ locale: string; collection: string; material: string }> }) {
  const { locale, collection, material } = await params;
  if ((locale !== "fa" && locale !== "en") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(collection) || (material !== "gold" && material !== "silver")) notFound();
  redirect(`/${locale}/products?material=${material}&collection=${encodeURIComponent(collection)}`);
}
