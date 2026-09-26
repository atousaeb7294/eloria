import { TreasuryPageTransition } from "@/components/treasury-transition";
import {
  setRequestLocale,
} from "next-intl/server";

import {
  EloriaIntroExperience,
} from "@/components/eloria-intro-experience";
import {
  HeroShowcase,
} from "@/components/hero-showcase";
import {
  HomeHeaderController,
} from "@/components/home-header-controller";
import { TreasuryPromenade } from "@/components/treasury-promenade";
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
    <div className="relative min-h-screen overflow-x-clip bg-[#02140e] text-[#f8f0df]">

<HomeHeaderController
        locale={
          locale
        }
      />

      <TreasuryPageTransition>
      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 outline-none"
      >
        <TreasuryPromenade locale={locale}>
        <HeroShowcase
          locale={
            locale
          }
          persianTitleClassName={
            "font-persian-title"
          }
        />

        </TreasuryPromenade>
        <div id="promenade-end" />
      </main>
      </TreasuryPageTransition>

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