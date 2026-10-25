import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

export const MODEL_RELATIVE_PATH =
  "services/cutout/models/birefnet-lite-512.onnx";
export const MODEL_URL =
  "https://huggingface.co/studioludens/birefnet-lite-512/resolve/962e67969ec6acec9c19fab76acee4f5e22e990c/onnx/model.onnx";
export const MODEL_SHA256 =
  "1cb0fb360dadd15af77c639085d77a9df67db0c64315560c3de005f676345ac2";

async function checksum(filename) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

/** Build-time only. Product photos never leave the application server. */
export async function ensureModel(root) {
  const filename = path.join(root, MODEL_RELATIVE_PATH);
  if ((await checksum(filename).catch(() => null)) === MODEL_SHA256)
    return filename;
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.download`;
  try {
    console.log(
      "[Eloria] Downloading the pinned background-removal model for this build...",
    );
    const response = await fetch(MODEL_URL, {
      signal: AbortSignal.timeout(300_000),
    });
    if (!response.ok || !response.body)
      throw new Error("Cutout model download failed. Retry the server build.");
    let size = 0;
    const limit = new Transform({
      transform(chunk, encoding, callback) {
        size += chunk.length;
        callback(
          size > 300 * 1024 * 1024
            ? new Error("Model exceeds size limit")
            : null,
          chunk,
        );
      },
    });
    await pipeline(
      Readable.fromWeb(response.body),
      limit,
      createWriteStream(temporary, { flags: "wx" }),
    );
    if ((await checksum(temporary)) !== MODEL_SHA256)
      throw new Error(
        "Cutout model checksum mismatch. Retry the server build.",
      );
    await rename(temporary, filename);
    console.log("[Eloria] Background-removal model verified and ready.");
    return filename;
  } finally {
    await rm(temporary, { force: true });
  }
}
