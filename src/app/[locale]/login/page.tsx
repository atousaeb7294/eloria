import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InternalPageShell } from "@/components/internal-page-shell";
import { CustomerLoginClient } from "@/components/customer-login-client";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getCustomerAuthChannelAvailability } from "@/lib/customer-auth-channels";

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
  const channelAvailability = getCustomerAuthChannelAvailability();
  const turnstileConfig = {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "",
    required: process.env.NODE_ENV === "production" || Boolean(process.env.TURNSTILE_SECRET_KEY?.trim()),
  };
  return <InternalPageShell locale={locale}>
    <link rel="preconnect" href="https://challenges.cloudflare.com" crossOrigin="anonymous" />
    <CustomerLoginClient locale={locale} nextPath={nextPath} channelAvailability={channelAvailability} turnstileConfig={turnstileConfig} />
  </InternalPageShell>;
}
