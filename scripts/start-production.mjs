import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";
const standalone = process.env.ELORIA_STANDALONE === "true";
const command = standalone
  ? process.execPath
  : process.platform === "win32"
    ? "npx.cmd"
    : "npx";
const args = standalone ? ["server.js"] : ["next", "start", "-p", port];

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
