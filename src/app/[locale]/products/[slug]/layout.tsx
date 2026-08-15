import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  if (locale !== "fa" && locale !== "en") return {};

  const encodedSlug = encodeURIComponent(slug);

  return {
    alternates: {
      canonical: `/${locale}/products/${encodedSlug}`,
      languages: {
        fa: `/fa/products/${encodedSlug}`,
        en: `/en/products/${encodedSlug}`,
      },
    },
  };
}

export default function ProductSlugLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
