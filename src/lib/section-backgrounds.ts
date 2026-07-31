export const SECTION_BACKGROUND_PATHS = [
  "/images/section-backgrounds/bg-01.jpeg",
  "/images/section-backgrounds/bg-02.jpeg",
  "/images/section-backgrounds/bg-03.jpeg",
  "/images/section-backgrounds/bg-04.jpeg",
  "/images/section-backgrounds/bg-05.jpeg",
  "/images/section-backgrounds/bg-06.jpeg",
  "/images/section-backgrounds/bg-07.jpeg",
  "/images/section-backgrounds/bg-08.jpeg",
  "/images/section-backgrounds/bg-09.jpeg",
] as const;

export type SectionBackgroundPath =
  (typeof SECTION_BACKGROUND_PATHS)[number];

export type ResolvedSectionBackground = {
  index: number;
  src: SectionBackgroundPath;
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