import "server-only";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setPriority } from "node:os";
import path from "node:path";
import { MAX_HERO_BYTES } from "@/lib/home-design-contract";

const script = () =>
  path.join(process.cwd(), "services/cutout/node-worker.mjs");

export function builtinCutoutAvailable() {
  return (
    existsSync(script()) &&
    existsSync(
      path.join(process.cwd(), "services/cutout/models/birefnet-lite-512.onnx"),
    )
  );
}

/** One isolated CPU process per photo; the database lease serializes all callers. */
export function prepareBuiltinCutout(bytes: Buffer): Promise<Buffer> {
  if (!bytes.length || bytes.length > MAX_HERO_BYTES)
    return Promise.reject(new Error("INVALID_IMAGE"));
  if (!existsSync(script())) return Promise.reject(new Error("MODEL_MISSING"));
  return new Promise((resolve, reject) => {
    // The image process needs no database/payment credentials or Node hooks.
    const env: NodeJS.ProcessEnv = { NODE_ENV: "production" };
    for (const name of [
      "PATH",
      "SystemRoot",
      "WINDIR",
      "TEMP",
      "TMP",
      "TMPDIR",
      "HOME",
      "USERPROFILE",
    ])
      if (process.env[name]) env[name] = process.env[name];
    const child = spawn(process.execPath, [script()], {
      cwd: process.cwd(),
      env,
      stdio: ["pipe", "pipe", "ignore", "ipc"],
    });
    if (child.pid) {
      try {
        setPriority(child.pid, 10);
      } catch {}
    }
    const chunks: Buffer[] = [];
    let size = 0,
      failure: Error | undefined;
    const stop = (message: string) => {
      failure ??= new Error(message);
      child.kill("SIGKILL");
    };
    const timer = setTimeout(() => stop("PROCESSING_TIMEOUT"), 110_000);
    child.stdout!.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_HERO_BYTES) stop("OUTPUT_TOO_LARGE");
      else chunks.push(chunk);
    });
    child.stdin!.on("error", () => {
      /* close reports the worker error */
    });
    child.on("error", () => {
      failure ??= new Error("PROCESSING_FAILED");
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code === 3) reject(new Error("MODEL_MISSING"));
      else if (code === 4) reject(new Error("SERVER_MEMORY"));
      else if (code !== 0 || !size) reject(new Error("PROCESSING_FAILED"));
      else resolve(Buffer.concat(chunks));
    });
    child.stdin!.end(bytes);
  });
}
