export type EloriaIntroExperienceProps = {
  locale: string;
};

export type IntroPhase =
  | "checking"
  | "video-one"
  | "awaiting-entry"
  | "loading-two"
  | "video-two"
  | "flash-in"
  | "hero-reveal"
  | "complete";

/** مدت اوج نور پس از پایان پرده دوم. */
export const FLASH_IN_DURATION_MS = 700;

/** مدت محوشدن نور و آشکارشدن کامل صفحه اصلی. */
export const HERO_REVEAL_DURATION_MS = 1500;

export const TOTAL_TRANSITION_DURATION_MS =
  FLASH_IN_DURATION_MS + HERO_REVEAL_DURATION_MS;

/**
 * پس از ورود کامل، نتیجه فقط در همان تب مرورگر نگه داشته می‌شود.
 * بازسازی React یا جابه‌جایی داخلی دیگر باعث پخش ناگهانی دوباره نمی‌شود.
 */
// Bumped once for this release so visitors who encountered the broken handoff
// receive one clean run of the repaired state machine. Completion is still
// locked for the rest of the current browser tab.
export const INTRO_SESSION_KEY = "eloria_intro_complete_v12";

export const INTRO_ASSET_VERSION = "2026-09-09-mobile-desktop-faststart-v12";

/** The entry artwork is baked into the final seconds of act one.
 * A transparent accessible hotspot is enabled only while that artwork is visible.
 */
export const INTRO_EMBEDDED_ENTRY_START_SECONDS = 8.9;

export const INTRO_VIDEO_ONE_SRC =
  `/videos/eloria-entry-v3.mp4?v=${INTRO_ASSET_VERSION}`;

export const INTRO_VIDEO_TWO_SRC =
  `/videos/eloria-opening-v4.mp4?v=${INTRO_ASSET_VERSION}`;

/**
 * Mobile renditions keep the same two-act intro, while avoiding a 1080p
 * download on small or data-constrained devices.
 */
export const INTRO_VIDEO_ONE_MOBILE_SRC =
  `/videos/eloria-entry-mobile-v1.mp4?v=${INTRO_ASSET_VERSION}`;

export const INTRO_VIDEO_TWO_MOBILE_SRC =
  `/videos/eloria-opening-mobile-v1.mp4?v=${INTRO_ASSET_VERSION}`;
