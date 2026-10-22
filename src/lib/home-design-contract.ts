export const HERO_PIPELINE_VERSION = "birefnet-lite-alpha-v2";
export const MAX_HERO_BYTES = 8 * 1024 * 1024;
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validFeaturedIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === 8 &&
    value.every((id) => typeof id === "string" && UUID_PATTERN.test(id)) &&
    new Set(value).size === 8
  );
}

export async function boundedImageBody(response: Response): Promise<Buffer> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (declaredLength > MAX_HERO_BYTES || !response.body)
    throw new Error("IMAGE_TOO_LARGE");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > MAX_HERO_BYTES) throw new Error("IMAGE_TOO_LARGE");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  if (!length) throw new Error("EMPTY_IMAGE");
  return Buffer.concat(chunks);
}
