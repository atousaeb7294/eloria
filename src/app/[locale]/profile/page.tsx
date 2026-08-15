import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InternalPageShell } from "@/components/internal-page-shell";
import { CustomerProfileClient } from "@/components/profile/customer-profile-client";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getCustomerDashboard } from "@/lib/customer-data";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ locale: string }> };
export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  const auth = await getCurrentCustomer();
  if (!auth) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/profile`)}`);
  const data = await getCustomerDashboard(auth.customer.id);
  return <InternalPageShell locale={locale}><CustomerProfileClient locale={locale} initialData={data} /></InternalPageShell>;
}
