import {
  Noto_Nastaliq_Urdu,
} from "next/font/google";

import {
  notFound,
} from "next/navigation";

import {
  setRequestLocale,
} from "next-intl/server";

import {
  AmbientEffects,
} from "@/components/ambient-effects";

import {
  CartLivePriceRefresh,
} from "@/components/cart-live-price-refresh";

import {
  CheckoutPageClient,
} from "@/components/checkout-page-client";

import {
  SiteHeader,
} from "@/components/site-header";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const persianTitleFont =
  Noto_Nastaliq_Urdu({
    subsets: [
      "arabic",
    ],

    weight: [
      "400",
      "500",
      "600",
      "700",
    ],

    display:
      "swap",
  });

type CheckoutPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function CheckoutPage({
  params,
}: CheckoutPageProps) {
  const {
    locale,
  } = await params;

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  setRequestLocale(
    locale,
  );

  const isPersian =
    locale === "fa";

  return (
    <main
      dir={
        isPersian
          ? "rtl"
          : "ltr"
      }
      className="relative min-h-screen overflow-hidden bg-[#02140e] text-[#f8f0df]"
    >
      <AmbientEffects />

      <SiteHeader />

      <CheckoutPageClient
        locale={locale}
        persianTitleClassName={
          persianTitleFont.className
        }
      />

      <CartLivePriceRefresh />
    </main>
  );
}