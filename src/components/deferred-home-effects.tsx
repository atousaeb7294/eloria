"use client";

import {
  AmbientEffects,
} from "@/components/ambient-effects";
import {
  HomePremiumEffects,
} from "@/components/home-premium-effects";
import {
  useIntroComplete,
} from "@/components/intro/use-intro-complete";

export function DeferredHomeEffects() {
  const introComplete =
    useIntroComplete();

  if (!introComplete) {
    return null;
  }

  return (
    <>
      <AmbientEffects />
      <HomePremiumEffects />
    </>
  );
}
