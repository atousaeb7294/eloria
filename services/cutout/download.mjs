import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

async function checksum(filename) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

/** Keep interrupted bytes, but never install an unverified model. */
export async function downloadVerifiedFile({ filename, url, sha256, bytes, fetchImpl = fetch, attempts = 3, timeoutMs = 900_000, log = console.log }) {
  if ((await checksum(filename).catch(() => null)) === sha256) return filename;
  await mkdir(path.dirname(filename), { recursive: true });
  const partial = `${filename}.part`;
  let failure;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      let size = (await stat(partial).catch(() => null))?.size ?? 0;
      if (size === bytes && (await checksum(partial)) === sha256) {
        await rename(partial, filename);
        return filename;
      }
      if (size >= bytes) { await rm(partial, { force: true }); size = 0; }
      log(`[Eloria] Model download ${attempt}/${attempts}: ${Math.floor(size / 1024 / 1024)} / ${Math.ceil(bytes / 1024 / 1024)} MiB. Interrupted downloads can be resumed.`);
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "Accept-Encoding": "identity", ...(size ? { Range: `bytes=${size}-` } : {}) },
      });
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new Error(`Model server returned HTTP ${response.status}`);
      }
      if (response.status === 206) {
        const range = response.headers.get("content-range")?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
        if (!range || Number(range[1]) !== size || Number(range[2]) !== bytes - 1 || Number(range[3]) !== bytes) {
          await response.body.cancel();
          throw new Error("Model server returned an unexpected byte range");
        }
      } else if (response.status === 200) {
        size = 0; // A server may ignore Range; replace rather than append.
      } else {
        await response.body.cancel();
        throw new Error(`Unexpected model response: ${response.status}`);
      }
      const append = size > 0;
      let lastProgress = Date.now();
      const limit = new Transform({
        transform(chunk, _encoding, callback) {
          size += chunk.length;
          if (size > bytes) return callback(new Error("Model exceeds pinned file size"));
          if (Date.now() - lastProgress > 5000) {
            log(`[Eloria] Model: ${Math.floor(size * 100 / bytes)}% (${Math.floor(size / 1024 / 1024)} MiB)`);
            lastProgress = Date.now();
          }
          callback(null, chunk);
        },
      });
      await pipeline(Readable.fromWeb(response.body), limit, createWriteStream(partial, { flags: append ? "a" : "w" }));
      if (size !== bytes) throw new Error("Model download ended early; saved bytes will be resumed");
      if ((await checksum(partial)) !== sha256) {
        await rm(partial, { force: true });
        throw new Error("Model checksum mismatch; restarting download");
      }
      await rename(partial, filename);
      log("[Eloria] Background-removal model verified and ready.");
      return filename;
    } catch (error) {
      failure = error;
      log(`[Eloria] ${error.message}. ${attempt < attempts ? "Retrying…" : "Saved partial bytes for the next build."}`);
    }
  }
  throw new Error("Model download could not finish. Check your connection and rerun the build; it resumes automatically.", { cause: failure });
}
