import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";
const baseUrl = `http://127.0.0.1:${port}`;
const secret = process.env.CRON_SECRET;
const standalone = process.env.ELORIA_STANDALONE === "true";
const command = standalone ? process.execPath : (process.platform === "win32" ? "npx.cmd" : "npx");
const args = standalone ? ["server.js"] : ["next", "start", "-p", port];
const child = spawn(command, args, {
  stdio: "inherit",
  env: { ...process.env, PORT: port, HOSTNAME: process.env.HOSTNAME || "0.0.0.0" },
});

let stopping = false;
const timers = [];

async function invoke(path) {
  if (!secret || stopping) return;
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok && response.status !== 202) {
      console.error(`[ELORIA CRON] ${path} returned ${response.status}`);
    }
  } catch (error) {
    console.error(`[ELORIA CRON] ${path} failed`, error);
  }
}

function schedule(path, intervalMs, initialDelayMs) {
  const start = setTimeout(() => {
    void invoke(path);
    const timer = setInterval(() => void invoke(path), intervalMs);
    timers.push(timer);
  }, initialDelayMs);
  timers.push(start);
}

schedule("/api/cron/expired-orders", 60_000, 15_000);
schedule("/api/cron/metal-prices", 10 * 60_000, 30_000);

function stop(signal) {
  if (stopping) return;
  stopping = true;
  for (const timer of timers) clearTimeout(timer);
  child.kill(signal);
}
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
child.on("exit", code => process.exit(code ?? 1));
