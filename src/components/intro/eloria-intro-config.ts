
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

/**
 * ابتدا نور طلایی روی ویدیوی دوم افزایش می‌یابد.
 */
export const FLASH_IN_DURATION_MS =
  700;

/**
 * پس از تعویض ویدیو با Hero،
 * نور و Blur به‌آرامی محو می‌شوند.
 */
export const HERO_REVEAL_DURATION_MS =
  1500;

export const TOTAL_TRANSITION_DURATION_MS =
  FLASH_IN_DURATION_MS +
  HERO_REVEAL_DURATION_MS;

export const INTRO_SESSION_KEY = "eloria_intro_seen_v5";
export const INTRO_MAX_FIRST_VIDEO_SECONDS = 5;

export type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

/**
 * با تغییر این مقدار، مرورگر نسخه جدید ویدئوهای Intro را
 * به‌جای فایل Cache‌شده قبلی دریافت می‌کند.
 */
export const INTRO_ASSET_VERSION =
  "2026-08-04-gsap-sigil-v5";

export const INTRO_VIDEO_ONE_SRC =
  `/videos/eloria-opening-v3.mp4?v=${INTRO_ASSET_VERSION}`;

export const INTRO_VIDEO_TWO_SRC =
  `/videos/eloria-entry-v3.mp4?v=${INTRO_ASSET_VERSION}`;
