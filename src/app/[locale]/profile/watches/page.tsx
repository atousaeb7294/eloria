import { notFound, redirect } from "next/navigation";

import { InternalPageShell } from "@/components/internal-page-shell";
import { CustomerWatchesClient } from "@/components/profile/customer-watches-client";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getCustomerProductWatches, isCustomerProductWatchesEnabled } from "@/lib/customer-product-watches";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CustomerWatchesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  const auth = await getCurrentCustomer();
  if (!auth) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/profile/watches`)}`);
  const watches = isCustomerProductWatchesEnabled() ? await getCustomerProductWatches(auth.customer.id) : [];
  return <InternalPageShell locale={locale}><CustomerWatchesClient locale={locale} enabled={isCustomerProductWatchesEnabled()} watches={watches.map((watch) => ({ ...watch, lastObservedPriceToman: watch.lastObservedPriceToman?.toString() ?? null, createdAt: watch.createdAt.toISOString(), updatedAt: watch.updatedAt.toISOString() }))} /></InternalPageShell>;
}
