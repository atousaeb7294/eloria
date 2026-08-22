import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../globals.css";

import { hasLocale, NextIntlClientProvider } from "next-intl";

import {
  getTranslations,
  setRequestLocale,
  getMessages,
} from "next-intl/server";

import { notFound } from "next/navigation";

import { PageBackgroundProvider } from "@/components/page-background-provider";
import { SiteStructuredData } from "@/components/site-structured-data";

import { routing } from "@/i18n/routing";
import { siteBaseUrl } from "@/lib/site-url";

type LocaleParams = Promise<{
  locale: string;
}>;

type LocaleLayoutProps = Readonly<{
  children: ReactNode;
  params: LocaleParams;
}>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({
    locale,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: LocaleParams;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({
    locale,
    namespace: "Metadata",
  });

  const baseUrl = siteBaseUrl();

  const title = t("title");
  const description = t("description");

  return {
    metadataBase: baseUrl,
    title,
    description,

    alternates: {
      canonical: `/${locale}`,
      languages: {
        fa: "/fa",
        en: "/en",
        "x-default": "/fa",
      },
    },

    openGraph: {
      type: "website",
      siteName: "ELORIA",
      locale: locale === "fa" ? "fa_IR" : "en_US",
      alternateLocale: locale === "fa" ? ["en_US"] : ["fa_IR"],
      title,
      description,
      url: `/${locale}`,
      images: [
        {
          url: "/images/hero/eloria-hero.jpeg",
          width: 1600,
          height: 900,
          alt: title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/hero/eloria-hero.jpeg"],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html
      data-scroll-behavior="smooth"
      lang={locale}
      dir={locale === "fa" ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body className="min-h-screen">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PageBackgroundProvider>
            <SiteStructuredData />
            {children}
          </PageBackgroundProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
