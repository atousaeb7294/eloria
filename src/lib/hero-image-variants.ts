// A small, fixed set of sizes bounds both CPU work and the media cache.
export const HERO_IMAGE_WIDTHS = [320, 480, 640, 800, 960, 1280] as const;

export function heroImageWidth(width: number) {
  return HERO_IMAGE_WIDTHS.find(size => size >= width) ?? 1280;
}

export function isPreparedHeroSource(src: string) {
  return /^\/api\/media\/hero\/[0-9a-f-]{36}$/i.test(src);
}

/** Direct public image delivery: no extra request through /_next/image. */
export function heroImageLoader({ src, width }: { src: string; width: number }) {
  return `${src}?w=${heroImageWidth(width)}&format=webp`;
}
