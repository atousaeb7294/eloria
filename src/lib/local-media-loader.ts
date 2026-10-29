import { heroImageLoader, isPreparedHeroSource } from "./hero-image-variants";
import { isLocalProductImage, productImageLoader } from "./product-image-variants";

/** Both ready transparent photos and catalog photos already have a size endpoint. */
export function localMediaLoader(src: unknown) {
  if (isLocalProductImage(src)) return productImageLoader;
  if (typeof src === "string" && isPreparedHeroSource(src)) return heroImageLoader;
  return undefined;
}
