import sharp from "sharp";

/** Accept an existing transparent photograph without a model or external worker. */
export async function prepareTransparentHero(bytes: Buffer): Promise<Buffer | null> {
  const input = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" });
  const metadata = await input.metadata();
  if (!metadata.hasAlpha) return null;
  const { data, info } = await input.rotate().toColourspace("srgb")
    .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0, visible = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 16) transparent++;
    if (data[i] >= 200) visible++;
  }
  const pixels = info.width * info.height;
  if (transparent / pixels < 0.02 || visible / pixels < 0.008) return null;
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
