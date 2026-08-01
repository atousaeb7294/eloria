import {
  setRequestLocale,
} from "next-intl/server";

import {
  AmbientEffects,
} from "@/components/ambient-effects";
import {
  EloriaIntroExperience,
} from "@/components/eloria-intro-experience";
import {
  HeroShowcase,
} from "@/components/hero-showcase";
import {
  HomeHeaderController,
} from "@/components/home-header-controller";
import {
  HomeShowcaseSections,
} from "@/components/home-showcase-sections";
import {
  SiteFooter,
} from "@/components/site-footer";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function HomePage({
  params,
}: HomePageProps) {
  const {
    locale,
  } = await params;

  setRequestLocale(
    locale,
  );

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-[#02140e] text-[#f8f0df]">
      <AmbientEffects />

      <HomeHeaderController
        locale={
          locale
        }
      />

      <HeroShowcase
        locale={
          locale
        }
        persianTitleClassName={
          "font-persian-title"
        }
      />

      <HomeShowcaseSections
        locale={locale}
        persianTitleClassName="font-persian-title"
      />

      <SiteFooter locale={locale} />

      <EloriaIntroExperience
        locale={
          locale
        }
      />
    </main>
  );
}