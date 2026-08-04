import type { Metadata } from "next";
import {
  notFound,
} from "next/navigation";

import {
  setRequestLocale,
} from "next-intl/server";

import {
  CartLivePriceRefresh,
} from "@/components/cart-live-price-refresh";

import {
  CartPageClient,
} from "@/components/cart-page-client";

import {
  InternalPageShell,
} from "@/components/internal-page-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

type CartPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function CartPage({
  params,
}: CartPageProps) {
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

  return (
    <InternalPageShell
      locale={locale}
    >
      <CartPageClient
        locale={locale}
        persianTitleClassName={
          "font-persian-title"
        }
      />

      <CartLivePriceRefresh />
    </InternalPageShell>
  );
}