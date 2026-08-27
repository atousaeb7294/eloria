"use client";

import dynamic from "next/dynamic";

import { useIntroComplete } from "@/components/intro/use-intro-complete";

const AmbientEffects = dynamic(
  () => import("@/components/ambient-effects").then((module) => module.AmbientEffects),
  { ssr: false },
);

const HomePremiumEffects = dynamic(
  () => import("@/components/home-premium-effects").then((module) => module.HomePremiumEffects),
  { ssr: false },
);

export function DeferredHomeEffects() {
  const introComplete = useIntroComplete();
  if (!introComplete) return null;

  return (
    <>
      <AmbientEffects />
      <HomePremiumEffects />
    </>
  );
}
