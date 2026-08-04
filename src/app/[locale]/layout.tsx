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

  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "https://eloria.example";
  const title = t("title");
  const description = t("description");

  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s | ELORIA` },
    description,
    applicationName: "ELORIA",
    alternates: {
      canonical: `/${locale}`,
      languages: { fa: "/fa", en: "/en", "x-default": "/fa" },
    },
    openGraph: {
      type: "website",
      siteName: "ELORIA",
      locale: locale === "fa" ? "fa_IR" : "en_US",
      title,
      description,
      images: [{ url: "/images/hero/eloria-hero.jpeg", width: 1600, height: 900, alt: "ELORIA" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/images/hero/eloria-hero.jpeg"] },
    manifest: "/manifest.webmanifest",
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const syncEloriaIntroState = () => {
                  document.documentElement.dataset.eloriaSkipIntro =
                    window.location.hash === "#hero" ? "true" : "false";
                };

                syncEloriaIntroState();
                window.addEventListener("hashchange", syncEloriaIntroState);
              })();
            `,
          }}
        />
      </head>
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