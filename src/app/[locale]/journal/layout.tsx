import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { localizedPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (locale !== "fa" && locale !== "en") {
    notFound();
  }

  const isPersian = locale === "fa";

  return localizedPageMetadata({
    locale,
    path: "/journal",
    title: isPersian
      ? "مجلهٔ الوریا | راهنمای انتخاب و مراقبت از جواهر"
      : "Eloria Journal | Jewellery guides and stories",
    description: isPersian
      ? "راهنماهای دقیق و بازبینی‌شدهٔ الوریا برای شناخت جواهر، انتخاب آگاهانه و مراقبت از آثار."
      : "Eloria's reviewed guides for understanding jewellery, making considered choices, and caring for your pieces.",
  });
}

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
