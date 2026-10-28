/** Local immutable product media only; external images keep the existing policy. */
export const PRODUCT_IMAGE_WIDTHS = [160, 240, 320, 480, 640, 800, 960, 1280, 1600] as const;
export function isLocalProductImage(src: unknown): src is string {
  return typeof src === "string" && /^\/api\/media\/products\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(src);
}
export function productImageLoader({src, width}: {src: string; width: number}) {
  const size = PRODUCT_IMAGE_WIDTHS.find(value => value >= width) ?? 1600;
  return `${src}?w=${size}&format=webp`;
}
