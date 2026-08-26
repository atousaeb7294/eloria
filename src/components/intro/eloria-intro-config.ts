export type EloriaIntroExperienceProps = {
  locale: string;
};

export type IntroPhase =
  | "checking"
  | "video-one"
  | "awaiting-entry"
  | "video-two"
  | "flash-in"
  | "hero-reveal"
  | "complete";

export const FLASH_IN_DURATION_MS = 700;
export const HERO_REVEAL_DURATION_MS = 1500;
export const TOTAL_TRANSITION_DURATION_MS =
  FLASH_IN_DURATION_MS + HERO_REVEAL_DURATION_MS;

export const INTRO_MAX_FIRST_VIDEO_SECONDS = Number.POSITIVE_INFINITY;

export type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

export const INTRO_ASSET_VERSION = "2026-08-26-performance-v2";

export const INTRO_VIDEO_ONE_SRC =
  `/videos/eloria-entry-v3.mp4?v=${INTRO_ASSET_VERSION}`;

export const INTRO_VIDEO_TWO_SRC =
  `/videos/eloria-opening-v5-optimized.mp4?v=${INTRO_ASSET_VERSION}`;
