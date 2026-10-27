import sharp from "sharp";
import { MAX_HERO_BYTES } from "@/lib/home-design-contract";
import { prepareTransparentHero } from "@/lib/transparent-hero";

/** Decode and validate the pixels. No background-removal service is used. */
export async function normalizeUploadedHero(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_HERO_BYTES)
    throw new Error("حجم عکس باید حداکثر ۸ مگابایت باشد.");
  let metadata;
  try {
    metadata = await sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" }).metadata();
  } catch {
    throw new Error("فایل عکس قابل خواندن نیست؛ یک PNG یا WebP شفاف انتخاب کنید.");
  }
  if (!["png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) !== 1)
    throw new Error("فقط عکس ثابت PNG یا WebP با پس‌زمینهٔ شفاف قابل استفاده است.");
  let png;
  try { png = await prepareTransparentHero(bytes); }
  catch { throw new Error("عکس ناقص یا خراب است؛ خروجی PNG یا WebP جدید بگیرید."); }
  if (!png) throw new Error("این عکس زمینهٔ شفاف ندارد. زمینهٔ سفید یا شطرنجیِ داخل عکس شفاف محسوب نمی‌شود؛ خروجی PNG یا WebP بدون زمینه بگیرید.");
  const info = await sharp(png).metadata();
  return { bytes: png, width: info.width!, height: info.height! };
}
