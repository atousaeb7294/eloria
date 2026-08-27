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

let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  child.kill(signal);
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
child.on("error", error => {
  console.error("[ELORIA] Unable to start the production server.", error);
  process.exitCode = 1;
});
child.on("exit", code => process.exit(code ?? 1));
