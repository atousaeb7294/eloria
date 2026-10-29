import { createHash } from "node:crypto";
import sharp from "sharp";
import { UUID_PATTERN } from "./home-design-contract";
import { HERO_IMAGE_WIDTHS } from "./hero-image-variants";
import { peekPublicMedia, readPublicMedia } from "./public-media-cache";

/** Resize existing alpha pixels only. Never run background removal on a visit. */
export async function encodeHeroVariant(bytes: Uint8Array, width: number) {
  return sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" })
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 100, effort: 3 })
    .toBuffer();
}

export async function serveHeroImage(
  request: Request,
  id: string,
  loadPublicPhoto: () => Promise<Uint8Array | null>,
) {
  const started = performance.now();
  const unavailable = (status: number) => new Response(null, {
    status, headers: { "Cache-Control": "no-store" },
  });
  if (!UUID_PATTERN.test(id)) return unavailable(404);
  const query = new URL(request.url).searchParams;
  const width = query.has("w") ? Number(query.get("w")) : null;
  const webp = query.get("format") === "webp";
  if (query.has("format") && !webp) return unavailable(400);
  if ((width !== null || webp) && (!webp || !HERO_IMAGE_WIDTHS.some(size => size === width)))
    return unavailable(400);
  try {
    let image = webp ? peekPublicMedia(`hero:${id}:webp86:${width}`) : null;
    const cacheHit = Boolean(image);
    if (!image) {
      // Finish the original read before admitting an encode. Nested cache loads
      // would exhaust the shared single-flight limit when several photos load.
      const original = await readPublicMedia(`hero:${id}`, async () => {
        const bytes = await loadPublicPhoto();
        return bytes ? { bytes, contentType: "image/png" } : null;
      });
      if (!original) return unavailable(404);
      image = webp && width !== null
        ? await readPublicMedia(`hero:${id}:webp86:${width}`, async () => ({
            bytes: new Uint8Array(await encodeHeroVariant(original.bytes, width)),
            contentType: "image/webp",
          }))
        : original;
    }
    if (!image) return unavailable(404);
    const etag = `"${createHash("sha256").update(image.bytes).digest("hex")}"`;
    const headers = {
      "Server-Timing": `media;dur=${(performance.now()-started).toFixed(1)}`,
      "X-Eloria-Media-Cache": cacheHit ? "hit" : "miss",
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=3600",
      "ETag": etag,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    };
    if (request.headers.get("if-none-match")?.split(",").some(value => value.trim() === etag))
      return new Response(null, { status: 304, headers });
    return new Response(new Uint8Array(image.bytes), {
      headers: { ...headers, "Content-Length": String(image.bytes.byteLength) },
    });
  } catch {
    return unavailable(503);
  }
}
