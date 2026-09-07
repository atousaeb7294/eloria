import { notFound, permanentRedirect } from "next/navigation";

/**
 * Legacy route kept for old bookmarks. The public world is now deliberately
 * separated into the Story and Atelier, preventing duplicate SEO content.
 */
export default async function LegacyWorldPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  permanentRedirect(`/${locale}/story`);
}
