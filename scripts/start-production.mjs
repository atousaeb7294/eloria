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
  Math.max(
    Number.parseInt(
      process.env.ELORIA_EMBEDDED_METAL_SYNC_INTERVAL_MINUTES || "5",
      10,
    ) || 5,
    2,
  ),
  60,
);

const startupProbeAttempts = Math.min(
  Math.max(
    Number.parseInt(
      process.env.ELORIA_EMBEDDED_METAL_SYNC_STARTUP_ATTEMPTS || "24",
      10,
    ) || 24,
    1,
  ),
  60,
);

const startupProbeDelayMs = Math.min(
  Math.max(
    Number.parseInt(
      process.env.ELORIA_EMBEDDED_METAL_SYNC_STARTUP_DELAY_MS || "5000",
      10,
    ) || 5000,
    1000,
  ),
  30000,
);

let metalSyncInterval;
let startupSyncCancelled = false;

const sleep = ms =>
  new Promise(resolveSleep => setTimeout(resolveSleep, ms));

async function waitForLocalServer() {
  for (let attempt = 1; attempt <= startupProbeAttempts; attempt += 1) {
    if (startupSyncCancelled) {
      return false;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/api/health`,
        {
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        },
      );

      if (response.ok) {
        console.log(
          `[ELORIA] Local server is ready for embedded metal sync (attempt ${attempt}).`,
        );
        return true;
      }

      console.warn(
        `[ELORIA] Startup health probe returned HTTP ${response.status} (attempt ${attempt}/${startupProbeAttempts}).`,
      );
    } catch {
      console.warn(
        `[ELORIA] Waiting for local server before metal sync (attempt ${attempt}/${startupProbeAttempts}).`,
      );
    }

    await sleep(startupProbeDelayMs);
  }

  return false;
}

async function runEmbeddedMetalSync() {
  const secret = process.env.CRON_SECRET?.trim();

  if (!embeddedMetalSyncEnabled || !secret) {
    return false;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/cron/metal-prices`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
        },
        signal: AbortSignal.timeout(90000),
        cache: "no-store",
      },
    );

    if (response.ok || response.status === 202) {
      console.log(
        `[ELORIA] Embedded metal sync completed with HTTP ${response.status}.`,
      );
      return true;
    }

    const responseText = await response.text().catch(() => "");

    console.error(
      `[ELORIA] Embedded metal sync returned HTTP ${response.status}${
        responseText
          ? `: ${responseText.slice(0, 500)}`
          : "."
      }`,
    );
  } catch (error) {
    console.error(
      "[ELORIA] Embedded metal sync failed.",
      error,
    );
  }

  return false;
}

async function startEmbeddedMetalSync() {
  if (!embeddedMetalSyncEnabled) {
    return;
  }

  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    console.error(
      "[ELORIA] Embedded metal sync is enabled but CRON_SECRET is missing.",
    );
    return;
  }

  const serverReady = await waitForLocalServer();

  if (!serverReady || startupSyncCancelled) {
    if (!startupSyncCancelled) {
      console.error(
        "[ELORIA] Embedded metal sync startup cancelled because the local server did not become ready in time.",
      );
    }

    return;
  }

  await runEmbeddedMetalSync();

  if (startupSyncCancelled) {
    return;
  }

  metalSyncInterval = setInterval(
    () => void runEmbeddedMetalSync(),
    metalSyncIntervalMinutes * 60_000,
  );
}

void startEmbeddedMetalSync();

let stopping = false;

function stop(signal) {
  if (stopping) {
    return;
  }

  stopping = true;
  startupSyncCancelled = true;

  if (metalSyncInterval) {
    clearInterval(metalSyncInterval);
  }

  child.kill(signal);
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));

child.on("error", error => {
  console.error(
    "[ELORIA] Unable to start the production server.",
    error,
  );

  process.exitCode = 1;
});

child.on("exit", code => {
  startupSyncCancelled = true;

  if (metalSyncInterval) {
    clearInterval(metalSyncInterval);
  }

  process.exit(code ?? 1);
});
