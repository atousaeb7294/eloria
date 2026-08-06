"use client";

import { useEloriaIntroController } from "@/components/intro/use-eloria-intro-controller";
import { EloriaIntroView } from "@/components/intro/eloria-intro-view";
import type { EloriaIntroExperienceProps } from "@/components/intro/eloria-intro-config";

export function EloriaIntroExperience(props: EloriaIntroExperienceProps) {
  const controller = useEloriaIntroController(props);
  return <EloriaIntroView {...props} controller={controller} />;
}
