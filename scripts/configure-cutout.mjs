import { fileURLToPath } from "node:url";
import { loadProjectEnvironment } from "./project-environment.mjs";
// Read-only validation with the same precedence as the production site.
const { cutout } = loadProjectEnvironment(fileURLToPath(new URL("../", import.meta.url)));
if (!cutout.valid) {
  throw new Error(
    `Cutout configuration: URL=${cutout.url}; TOKEN=${cutout.token}. No environment file was changed and no values were printed.`,
  );
}
console.log(
  "Cutout settings are available. No environment file was modified and no secrets were printed.",
);
