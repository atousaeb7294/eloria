import { inspectCutoutConfiguration, loadProjectEnvironment } from "./project-environment.mjs";

// Exit codes let the Windows installer reuse an existing service without changing env.
// 0 = ready, 2 = local service unavailable, 3 = remote service unavailable, 4 = config.
export async function checkCutoutHealth(env = process.env, request = fetch) {
  if (!inspectCutoutConfiguration(env).valid) return 4;
  const url = new URL(env.ELORIA_CUTOUT_URL);
  // This compose file listens on this exact loopback port only.
  const local = ["localhost", "127.0.0.1"].includes(url.hostname) &&
    url.protocol === "http:" && url.port === "8765";
  try {
    const response = await request(new URL("/health", url), {
      headers: { Authorization: `Bearer ${env.ELORIA_CUTOUT_TOKEN}` },
      signal: AbortSignal.timeout(5_000), redirect: "error", cache: "no-store",
    });
    if (response.ok) {
      const body = (await response.text()).trim();
      if (body === "ready" || JSON.parse(body).ready === true) return 0;
    }
  } catch { /* Print neither configuration nor credentials. */ }
  return local ? 2 : 3;
}

import path from "node:path";
import { fileURLToPath } from "node:url";
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  loadProjectEnvironment(process.cwd());
  const configuration = inspectCutoutConfiguration();
  if (!configuration.valid) {
    console.error(`Cutout configuration: URL=${configuration.url}; TOKEN=${configuration.token}. No values were printed or changed.`);
  }
  process.exitCode = await checkCutoutHealth();
}
