export const SECTION_BACKGROUND_PATHS = [
  "/images/section-backgrounds/bg-01.webp",
  "/images/section-backgrounds/bg-02.webp",
  "/images/section-backgrounds/bg-03.webp",
  "/images/section-backgrounds/bg-04.webp",
  "/images/section-backgrounds/bg-05.webp",
  "/images/section-backgrounds/bg-06.webp",
  "/images/section-backgrounds/bg-07.webp",
  "/images/section-backgrounds/bg-08.webp",
  "/images/section-backgrounds/bg-09.webp",
] as const;

export const MOBILE_SECTION_BACKGROUND_PATHS = [
  "/images/section-backgrounds/mobile/bg-01.jpg",
  "/images/section-backgrounds/mobile/bg-02.jpg",
  "/images/section-backgrounds/mobile/bg-03.jpg",
  "/images/section-backgrounds/mobile/bg-04.jpg",
  "/images/section-backgrounds/mobile/bg-05.jpg",
  "/images/section-backgrounds/mobile/bg-06.jpg",
  "/images/section-backgrounds/mobile/bg-07.jpg",
  "/images/section-backgrounds/mobile/bg-08.jpg",
] as const;

export type SectionBackgroundPath =
  (typeof SECTION_BACKGROUND_PATHS)[number];

export type MobileSectionBackgroundPath =
  (typeof MOBILE_SECTION_BACKGROUND_PATHS)[number];

export type ResolvedSectionBackground = {
  index: number;
  src: SectionBackgroundPath;
};

export type ResolvedMobileSectionBackground = {
  index: number;
  src: MobileSectionBackgroundPath;
};

type ResolveSectionBackgroundOptions = {
  seed?: string;
  fixedIndex?: number;
  offset?: number;
};

function createStableHash(
  value: string,
): number {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(
      hash,
      16777619,
    );
  }

  return hash >>> 0;
}

function normalizeIndex(
  index: number,
  length: number,
): number {
  return (
    ((index % length) +
      length) %
    length
  );
}

export function resolveSectionBackground({
  seed = "",
  fixedIndex,
  offset = 0,
}: ResolveSectionBackgroundOptions = {}): ResolvedSectionBackground {
  const backgroundCount =
    SECTION_BACKGROUND_PATHS.length;

  const baseIndex =
    typeof fixedIndex === "number" &&
    Number.isFinite(fixedIndex)
      ? Math.trunc(fixedIndex)
      : createStableHash(seed);

  const resolvedIndex =
    normalizeIndex(
      baseIndex +
        Math.trunc(offset),
      backgroundCount,
    );

  return {
    index: resolvedIndex,
    src:
      SECTION_BACKGROUND_PATHS[
        resolvedIndex
      ],
  };
}

export function resolveMobileSectionBackground({
  seed = "",
  fixedIndex,
  offset = 0,
}: ResolveSectionBackgroundOptions = {}): ResolvedMobileSectionBackground {
  const backgroundCount =
    MOBILE_SECTION_BACKGROUND_PATHS.length;

  const baseIndex =
    typeof fixedIndex === "number" &&
    Number.isFinite(fixedIndex)
      ? Math.trunc(fixedIndex)
      : createStableHash(seed);

  const resolvedIndex =
    normalizeIndex(
      baseIndex +
        Math.trunc(offset),
      backgroundCount,
    );

  return {
    index: resolvedIndex,
    src:
      MOBILE_SECTION_BACKGROUND_PATHS[
        resolvedIndex
      ],
  };
}
