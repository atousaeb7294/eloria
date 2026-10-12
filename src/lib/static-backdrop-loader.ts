import manifest from "./static-backdrop-manifest.json";

type Variant = { width: number; url: string };
const backgrounds: Record<string, Variant[]> = manifest;

/** Only bundled decorative images use this loader; product photos keep Next optimization. */
export function staticBackdropLoader({ src, width }: { src: string; width: number }): string {
  const variants = backgrounds[src];
  if (!variants?.length) throw new Error(`Missing static backdrop: ${src}`);
  return (variants.find(variant => variant.width >= width) ?? variants[variants.length - 1]).url;
}
