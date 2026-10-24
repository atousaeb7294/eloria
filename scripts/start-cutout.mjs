import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadProjectEnvironment } from "./project-environment.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadProjectEnvironment(root);
// Opt-out alone is not a network boundary. Runtime always uses internal Docker.
const child = spawn(
  "docker",
  [
    "compose",
    "-f",
    "docker-compose.cutout-local.yml",
    "up",
    "--build",
    "--abort-on-container-exit",
  ],
  { cwd: root, stdio: "inherit" },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
