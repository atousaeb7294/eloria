import {
  Noto_Nastaliq_Urdu,
} from "next/font/google";
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

const persianTitleFont =
  Noto_Nastaliq_Urdu({
    subsets: [
      "arabic",
    ],
    weight: [
      "400",
      "500",
      "600",
      "700",
    ],
    display: "swap",
  });

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
    <main className="relative min-h-screen overflow-hidden bg-[#02140e] text-[#f8f0df]">
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
          persianTitleFont.className
        }
      />

      <EloriaIntroExperience
        locale={
          locale
        }
      />
    </main>
  );
}