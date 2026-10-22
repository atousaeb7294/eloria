import fs from "node:fs";
import { parse } from "dotenv";
// Read-only validation: never create, copy or rewrite an environment file.
const filename = new URL("../.env", import.meta.url);
const saved = fs.existsSync(filename)
  ? parse(fs.readFileSync(filename, "utf8"))
  : {};
const url = process.env.ELORIA_CUTOUT_URL || saved.ELORIA_CUTOUT_URL;
const token = process.env.ELORIA_CUTOUT_TOKEN || saved.ELORIA_CUTOUT_TOKEN;
if (!url || !token || token.length < 32) {
  throw new Error(
    "Set ELORIA_CUTOUT_URL and a random ELORIA_CUTOUT_TOKEN of at least 32 characters in your process/hosting settings before starting the image processor. No .env file was changed.",
  );
}
console.log(
  "Cutout settings are available. No environment file was modified and no secrets were printed.",
);
