import { spawnSync } from "node:child_process";

// Release readiness requires the current CI gate, including database tests,
// production build and browser tests. Static source assertions alone cannot
// certify a release. Missing prerequisites must fail rather than be skipped.
const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "verify:ci"], {
  cwd: new URL("..", import.meta.url),
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
