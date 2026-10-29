import { createMediaFlight } from "./media-flight";
type Asset = { bytes: Uint8Array; contentType: string };
const cache = new Map<string, { asset: Asset; until: number }>();
let flight = createMediaFlight();
let generation = 0;
const MAX_BYTES = 16 * 1024 * 1024;
let retainedBytes = 0;
export function peekPublicMedia(id: string): Asset | null {
  const hit = cache.get(id);
  if (!hit) return null;
  if (hit.until <= Date.now()) { retainedBytes -= hit.asset.bytes.byteLength; cache.delete(id); return null; }
  cache.delete(id);
  cache.set(id, hit);
  return hit.asset;
}
export function invalidatePublicMedia() {
  generation++;
  cache.clear();
  retainedBytes = 0;
  flight = createMediaFlight();
}
/** UUID assets are immutable. A short byte-bounded cache protects the DB pool. */
export function readPublicMedia(id: string, load: () => Promise<Asset | null>, options: { maxAgeMs?: number } = {}): Promise<Asset | null> {
  const now = Date.now();
  for (const [key, value] of cache) {
    if (value.until <= now) { retainedBytes -= value.asset.bytes.byteLength; cache.delete(key); }
  }
  const hit = peekPublicMedia(id);
  if (hit) return Promise.resolve(hit);
  const startedGeneration = generation;
  return flight(id, async () => {
    const asset = await load();
    if (startedGeneration === generation && asset && asset.bytes.byteLength <= 2 * 1024 * 1024) {
      while (retainedBytes + asset.bytes.byteLength > MAX_BYTES || cache.size >= 64) {
        const oldest = cache.entries().next().value;
        if (!oldest) break;
        retainedBytes -= oldest[1].asset.bytes.byteLength; cache.delete(oldest[0]);
      }
      cache.set(id, { asset, until: Date.now() + Math.min(3600000, Math.max(1000, options.maxAgeMs ?? 60000)) });
      retainedBytes += asset.bytes.byteLength;
    }
    return asset;
  });
}
