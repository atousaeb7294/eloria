import "dotenv/config";
import { backupDatabase } from "./backup-database.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || "");
if (site.protocol !== "https:") throw Error("Public HTTPS site required");
const dir = process.env.ELORIA_OPERATIONS_STATE_DIR;
if (!dir) throw Error("Set private ELORIA_OPERATIONS_STATE_DIR");
await mkdir(resolve(dir), { recursive: true, mode: 0o700 });
const stateFile = join(resolve(dir), "operations-state.json");
let state = await readFile(stateFile, "utf8")
  .then(JSON.parse)
  .catch(() => ({ failures: 0, alerted: false, lastBackup: 0 }));
async function alert(message) {
  const endpoint = process.env.ELORIA_OPERATIONS_WEBHOOK;
  if (!endpoint) {
    console.error(message);
    return false;
  }
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password)
    throw Error("HTTPS webhook required");
  const res = await fetch(url, {
    method: "POST",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.ELORIA_OPERATIONS_WEBHOOK_TOKEN
        ? {
            Authorization: `Bearer ${process.env.ELORIA_OPERATIONS_WEBHOOK_TOKEN}`,
          }
        : {}),
    },
    body: JSON.stringify({
      service: "Eloria",
      message,
      time: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(10000),
  });
  return res.ok;
}
let backupTask = null;
async function tick() {
  try {
    let healthy = false;
    try {
      const res = await fetch(new URL("/api/health", site), {
        signal: AbortSignal.timeout(15000),
        redirect: "error",
        cache: "no-store",
      });
      healthy = res.ok;
    } catch {}
    state.failures = healthy ? 0 : state.failures + 1;
    if (state.failures >= 3 && !state.alerted)
      state.alerted = await alert(
        "Store readiness failed three consecutive checks.",
      );
    if (healthy && state.alerted) {
      if (await alert("Store readiness recovered.")) state.alerted = false;
    }
    if (
      process.env.ELORIA_BACKUP_ENABLED === "true" &&
      !backupTask &&
      Date.now() - state.lastBackup >= 86400000 &&
      Date.now() - (state.lastBackupAttempt || 0) >= 3600000
    ) {
      state.lastBackupAttempt = Date.now();
      backupTask = (async () => {
        try {
          await backupDatabase();
          state.lastBackup = Date.now();
          state.backupFailure = false;
        } catch {
          if (!state.backupFailure)
            state.backupFailure = await alert("Daily database backup failed.");
        }
      })()
        .catch(() => console.error("Backup alert unavailable."))
        .finally(() => {
          backupTask = null;
        });
    }
    if (process.argv.includes("--once") && backupTask) await backupTask;
    await writeFile(
      stateFile,
      JSON.stringify({ ...state, checkedAt: new Date().toISOString() }),
      { mode: 0o600 },
    );
  } catch {
    console.error("Operations check failed; retrying next cycle.");
  }
}
let stopped = false;
process.on("SIGTERM", () => {
  stopped = true;
});
process.on("SIGINT", () => {
  stopped = true;
});
while (!stopped) {
  await tick();
  if (process.argv.includes("--once")) break;
  await new Promise((resolve) => setTimeout(resolve, 60000));
}
