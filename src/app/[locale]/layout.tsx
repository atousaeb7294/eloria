import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

import "../globals.css";

import {
  hasLocale,
  NextIntlClientProvider,
} from "next-intl";

import {
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

import {
  notFound,
} from "next/navigation";

import {
  PageBackgroundProvider,
} from "@/components/page-background-provider";

import {
  routing,
} from "@/i18n/routing";

type LocaleParams =
  Promise<{
    locale: string;
  }>;

type LocaleLayoutProps =
  Readonly<{
    children: ReactNode;
    params: LocaleParams;
  }>;

export function generateStaticParams() {
  return routing.locales.map(
    (locale) => ({
      locale,
    }),
  );
}

export async function generateMetadata({
  params,
}: {
  params: LocaleParams;
}): Promise<Metadata> {
  const {
    locale,
  } = await params;

  if (
    !hasLocale(
      routing.locales,
      locale,
    )
  ) {
    return {};
  }

  const t =
    await getTranslations({
      locale,
      namespace:
        "Metadata",
    });

  return {
    title:
      t("title"),

    description:
      t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const {
    locale,
  } = await params;

  if (
    !hasLocale(
      routing.locales,
      locale,
    )
  ) {
    notFound();
  }

  setRequestLocale(
    locale,
  );

  return (
    <html
      lang={locale}
      dir={
        locale === "fa"
          ? "rtl"
          : "ltr"
      }
      suppressHydrationWarning
    >
      <body className="min-h-screen">
        <NextIntlClientProvider>
          <PageBackgroundProvider>
            {children}
          </PageBackgroundProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}