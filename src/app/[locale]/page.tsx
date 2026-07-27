import { setRequestLocale } from "next-intl/server";

import { AmbientEffects } from "@/components/ambient-effects";
import { HeroShowcase } from "@/components/hero-showcase";
import { SiteHeader } from "@/components/site-header";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function HomePage({
  params,
}: HomePageProps) {
  const { locale } = await params;

  setRequestLocale(locale);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#02140e] text-[#f8f0df]">
      <AmbientEffects />
      <SiteHeader />
      <HeroShowcase />
    </main>
  );
}
