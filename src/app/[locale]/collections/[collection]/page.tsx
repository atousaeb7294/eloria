import { notFound, redirect } from "next/navigation";

export default async function LegacyCollectionPage({ params }: { params: Promise<{ locale: string; collection: string }> }) {
  const { locale, collection } = await params;
  if ((locale !== "fa" && locale !== "en") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(collection)) notFound();
  redirect(`/${locale}/products?collection=${encodeURIComponent(collection)}`);
}
