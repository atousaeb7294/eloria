import {
  setRequestLocale,
} from "next-intl/server";

import {
  DeferredHomeEffects,
} from "@/components/deferred-home-effects";
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
    <div className="relative min-h-screen overflow-hidden bg-[#02140e] text-[#f8f0df]">
      <DeferredHomeEffects />

<HomeHeaderController
        locale={
          locale
        }
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 outline-none"
      >
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
      </main>

      <div className="relative z-10">
        <SiteFooter locale={locale} />
      </div>

      <EloriaIntroExperience
        locale={
          locale
        }
      />
    </div>
  );
}