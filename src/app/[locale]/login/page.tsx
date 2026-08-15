import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InternalPageShell } from "@/components/internal-page-shell";
import { CustomerLoginClient } from "@/components/customer-login-client";
import { getCurrentCustomer } from "@/lib/customer-auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };
export default async function CustomerLoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  if (locale !== "fa" && locale !== "en") notFound();
  const auth = await getCurrentCustomer();
  if (auth) redirect(`/${locale}/profile`);
  const nextPath = typeof query.next === "string" && query.next.startsWith(`/${locale}/`) ? query.next : null;
  return <InternalPageShell locale={locale}><CustomerLoginClient locale={locale} nextPath={nextPath} /></InternalPageShell>;
}
