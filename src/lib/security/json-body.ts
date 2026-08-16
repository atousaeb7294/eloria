/* ELORIA_FINAL_JSON_BODY_LIMIT_V1 */
export type JsonRequestBodyErrorCode =
  | "INVALID_JSON"
  | "PAYLOAD_TOO_LARGE";

export class JsonRequestBodyError extends Error {
  readonly code: JsonRequestBodyErrorCode;
  readonly status: 400 | 413;

  constructor(code: JsonRequestBodyErrorCode, message: string) {
    super(message);
    this.name = "JsonRequestBodyError";
    this.code = code;
    this.status = code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
  }
}

export async function readJsonBody<T = unknown>(
  request: Request,
  maximumBytes: number,
): Promise<T> {
  const limit = Math.max(1, Math.trunc(maximumBytes));
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const declaredBytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > limit) {
      throw new JsonRequestBodyError(
        "PAYLOAD_TOO_LARGE",
        "حجم درخواست بیش از حد مجاز است.",
      );
    }
  }

  if (!request.body) {
    throw new JsonRequestBodyError(
      "INVALID_JSON",
      "بدنه JSON معتبر نیست.",
    );
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > limit) {
        await reader.cancel();
        throw new JsonRequestBodyError(
          "PAYLOAD_TOO_LARGE",
          "حجم درخواست بیش از حد مجاز است.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(merged);
  } catch {
    throw new JsonRequestBodyError(
      "INVALID_JSON",
      "کدگذاری بدنه درخواست معتبر نیست.",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new JsonRequestBodyError(
      "INVALID_JSON",
      "بدنه JSON معتبر نیست.",
    );
  }
}
