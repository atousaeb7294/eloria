import nextEnv from "@next/env";
import { randomBytes } from "node:crypto";

const missing = value => typeof value !== "string" || !value.trim();

/** Return status labels only. Never return or log secret values. */
export function inspectCutoutConfiguration(env = process.env) {
  let url = missing(env.ELORIA_CUTOUT_URL) ? "missing" : "configured";
  if (url === "configured") {
    try {
      const parsed = new URL(env.ELORIA_CUTOUT_URL);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) url = "invalid";
    } catch { url = "invalid"; }
  }
  const value = env.ELORIA_CUTOUT_TOKEN;
  const token = missing(value) ? "missing" : value.length < 32 ? "too-short" : !/^[\x21-\x7e]+$/.test(value) ? "invalid" : "configured";
  return { url, token, valid: url === "configured" && token === "configured" };
}

/** Match production Next.js precedence; never create or rewrite any env file. */
export function loadProjectEnvironment(root, { localCutout = false } = {}) {
  const { loadedEnvFiles } = nextEnv.loadEnvConfig(root, false, {
    info() {},
    error() { throw new Error("Unable to read project settings. No values were logged or changed."); },
  });
  let sessionCutout = false;
  // A fresh local worker can be configured in memory only when neither setting exists.
  // Never replace an existing/partial/invalid service configuration.
  if (localCutout && missing(process.env.ELORIA_CUTOUT_URL) && missing(process.env.ELORIA_CUTOUT_TOKEN)) {
    process.env.ELORIA_CUTOUT_URL = "http://127.0.0.1:8765";
    process.env.ELORIA_CUTOUT_TOKEN = randomBytes(48).toString("hex");
    sessionCutout = true;
  }
  return { loadedFiles: loadedEnvFiles.map(file => file.path), sessionCutout, cutout: inspectCutoutConfiguration() };
}
