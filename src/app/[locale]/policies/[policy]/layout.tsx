import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

const policies = new Set(["privacy", "terms", "shipping", "returns"]);

export async function generateMetadata({ params }: { params: Promise<{ locale: string; policy: string }> }): Promise<Metadata> {
  const { locale, policy } = await params;
  if ((locale !== "fa" && locale !== "en") || !policies.has(policy)) notFound();
  return {
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/${locale}/policies/${policy}`,
      languages: {
        fa: `/fa/policies/${policy}`,
        en: `/en/policies/${policy}`,
      },
    },
  };
}

export default function PolicyLayout({ children }: { children: ReactNode }) {
  return children;
}
