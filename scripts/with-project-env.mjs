import { spawnSync } from "node:child_process";
import { loadProjectEnvironment } from "./project-environment.mjs";

try {
  const args = process.argv.slice(2);
  const localCutout = args[0] === "--local-cutout";
  if (localCutout) args.shift();
  const [command, ...commandArgs] = args;
  if (!command) throw new Error("A command is required.");
  const settings = loadProjectEnvironment(process.cwd(), { localCutout });
  if (settings.sessionCutout) {
    console.log("Local background-removal settings were created for this run only. No env file was changed.");
  }
  const result = spawnSync(command, commandArgs, { stdio: "inherit", env: process.env });
  if (result.error) throw new Error("Unable to start the installation command.");
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
