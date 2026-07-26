import Image from "next/image";
import {
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

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

  const t = await getTranslations("Hero");

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#02150f] text-[#f5efe4]">
      <Image
        src="/images/hero/eloria-hero.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="z-0 object-cover object-center"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(1,18,12,0.34)_0%,rgba(2,40,28,0.27)_38%,rgba(1,17,11,0.8)_100%)]"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 z-[2] bg-[radial-gradient(circle_at_50%_58%,transparent_18%,rgba(0,20,13,0.22)_57%,rgba(0,10,7,0.76)_100%)]"
      />

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-[3] h-[53%] bg-gradient-to-t from-[#01100b]/92 via-[#04261b]/36 to-transparent"
      />

      <AmbientEffects />

      <SiteHeader />

      <HeroShowcase
        tagline={t("tagline")}
        enterWorld={t("enterWorld")}
      />
    </main>
  );
}