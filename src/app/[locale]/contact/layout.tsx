import type { ReactNode } from "react";
import type { Metadata } from "next";
import { localizedPageMetadata, type EloriaLocale } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") return {};

  return localizedPageMetadata({
    locale: locale as EloriaLocale,
    path: "/contact",
    title: locale === "fa" ? "ارتباط با الوریا" : "Contact Eloria",
    description:
      locale === "fa"
        ? "برای راهنمایی خرید، پیگیری سفارش و درخواست‌های همکاری با الوریا در ارتباط باشید."
        : "Contact Eloria for purchase guidance, order support and partnership enquiries.",
  });
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}
