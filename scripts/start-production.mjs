import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const port = process.env.PORT || "3000";
const standaloneServer = resolve(process.cwd(), ".next", "standalone", "server.js");
const standalone =
  process.env.ELORIA_STANDALONE === "true" || existsSync(standaloneServer);

if (standalone && existsSync(standaloneServer)) {
  const standaloneRoot = dirname(standaloneServer);
  const staticTarget = resolve(standaloneRoot, ".next", "static");
  const publicTarget = resolve(standaloneRoot, "public");

  if (!existsSync(staticTarget)) {
    mkdirSync(dirname(staticTarget), { recursive: true });
    cpSync(resolve(process.cwd(), ".next", "static"), staticTarget, { recursive: true });
  }
  if (!existsSync(publicTarget)) {
    cpSync(resolve(process.cwd(), "public"), publicTarget, { recursive: true });
  }
}
const require = createRequire(import.meta.url);
const command = process.execPath;
const args = standalone
  ? [standaloneServer]
  : [require.resolve("next/dist/bin/next"), "start", "-p", port];

const child = spawn(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: process.env.HOSTNAME || "0.0.0.0",
  },
});

const embeddedMetalSyncEnabled =
  process.env.ELORIA_EMBEDDED_METAL_SYNC_ENABLED?.trim().toLowerCase() === "true";
const metalSyncIntervalMinutes = Math.min(
  Math.max(Number.parseInt(process.env.ELORIA_EMBEDDED_METAL_SYNC_INTERVAL_MINUTES || "5", 10) || 5, 2),
  60,
);
let metalSyncTimer;

async function runEmbeddedMetalSync() {
  const secret = process.env.CRON_SECRET?.trim();
  if (!embeddedMetalSyncEnabled || !secret) return;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/cron/metal-prices`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok && response.status !== 202) {
      console.error(`[ELORIA] Embedded metal sync returned HTTP ${response.status}.`);
    }
  } catch (error) {
    console.error("[ELORIA] Embedded metal sync failed.", error);
  }
}

if (embeddedMetalSyncEnabled) {
  metalSyncTimer = setTimeout(() => {
    void runEmbeddedMetalSync();
    metalSyncTimer = setInterval(
      () => void runEmbeddedMetalSync(),
      metalSyncIntervalMinutes * 60_000,
    );
  }, 15_000);
}

let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  if (metalSyncTimer) clearTimeout(metalSyncTimer);
  child.kill(signal);
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
child.on("error", error => {
  console.error("[ELORIA] Unable to start the production server.", error);
  process.exitCode = 1;
});
child.on("exit", code => process.exit(code ?? 1));
