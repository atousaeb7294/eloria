import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { inspectCutoutConfiguration } from "./project-environment.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloria-env-tests-"));
const loader = new URL("./project-environment.mjs", import.meta.url).href;
const wrapper = fileURLToPath(new URL("./with-project-env.mjs", import.meta.url));
const parentEnvironment = { ...process.env };
const clean = { ...process.env, NODE_ENV: "production" };
delete clean.ELORIA_CUTOUT_URL;
delete clean.ELORIA_CUTOUT_TOKEN;
delete clean.__NEXT_PROCESSED_ENV;
let count = 0;
function fixture(files = {}) {
  const dir = path.join(root, String(++count));
  fs.mkdirSync(dir);
  for (const [name, contents] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), contents);
  return { dir, files };
}
function evaluate(f, localCutout, assertion, overrides = {}) {
  const before = Object.fromEntries(fs.readdirSync(f.dir).map(name => [name, fs.readFileSync(path.join(f.dir, name))]));
  const code = `import assert from 'node:assert/strict'; import {loadProjectEnvironment} from ${JSON.stringify(loader)};
    const result=loadProjectEnvironment(process.cwd(),{localCutout:${localCutout}}); ${assertion}
    console.log(JSON.stringify(result));`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", code], { cwd: f.dir, env: { ...clean, ...overrides }, encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr);
  for (const value of Object.values(f.files)) {
    for (const line of value.split("\n")) {
      const secret = /^ELORIA_CUTOUT_TOKEN=(.+)$/.exec(line)?.[1];
      if (secret) assert.ok(!`${child.stdout}${child.stderr}`.includes(secret), "Secret must never be logged");
    }
  }
  const after = Object.fromEntries(fs.readdirSync(f.dir).map(name => [name, fs.readFileSync(path.join(f.dir, name))]));
  assert.deepEqual(after, before, "All env files and directory contents must remain byte-identical");
  return JSON.parse(child.stdout.trim());
}
try {
  const saved = fixture({
    ".env": "ELORIA_CUTOUT_URL=http://base.invalid\nELORIA_CUTOUT_TOKEN=base-test-value-is-long-enough-12345\n",
    ".env.local": "ELORIA_CUTOUT_URL=http://local.invalid\nELORIA_CUTOUT_TOKEN=local-test-value-is-long-enough-12345\n",
    ".env.production": "ELORIA_CUTOUT_URL=http://production.invalid\n",
    ".env.production.local": "ELORIA_CUTOUT_URL=http://preferred.invalid\n",
  });
  assert.equal(evaluate(saved, true, `assert.equal(process.env.ELORIA_CUTOUT_URL,'http://preferred.invalid'); assert.equal(process.env.ELORIA_CUTOUT_TOKEN,'local-test-value-is-long-enough-12345'); assert.equal(result.sessionCutout,false);`).cutout.valid, true);
  evaluate(saved, true, `assert.equal(process.env.ELORIA_CUTOUT_URL,'http://process.invalid'); assert.equal(result.sessionCutout,false);`, { ELORIA_CUTOUT_URL: "http://process.invalid" });
  const onlyLocal = fixture({ ".env.local": "ELORIA_CUTOUT_URL=http://127.0.0.1:8765\nELORIA_CUTOUT_TOKEN=local-only-test-token-123456789012345\n" });
  assert.equal(evaluate(onlyLocal, true, "assert.equal(result.sessionCutout,false);").cutout.valid, true);
  const expanded = fixture({ ".env.local": "CUTOUT_PORT=8765\nELORIA_CUTOUT_URL=http://127.0.0.1:$CUTOUT_PORT\nELORIA_CUTOUT_TOKEN=expanded-test-token-123456789012345\n" });
  evaluate(expanded, false, "assert.equal(process.env.ELORIA_CUTOUT_URL,'http://127.0.0.1:8765');");
  const empty = fixture();
  assert.equal(evaluate(empty, false, "assert.equal(result.sessionCutout,false);").cutout.valid, false);
  assert.equal(evaluate(empty, true, "assert.equal(result.sessionCutout,true); assert.equal(process.env.ELORIA_CUTOUT_URL,'http://127.0.0.1:8765'); assert.match(process.env.ELORIA_CUTOUT_TOKEN,/^[a-f0-9]{96}$/);").cutout.valid, true);
  const partial = fixture({ ".env.local": "ELORIA_CUTOUT_URL=https://existing.invalid\n" });
  assert.equal(evaluate(partial, true, "assert.equal(result.sessionCutout,false); assert.equal(process.env.ELORIA_CUTOUT_URL,'https://existing.invalid'); assert.equal(process.env.ELORIA_CUTOUT_TOKEN,undefined);").cutout.token, "missing");
  const invalid = fixture({ ".env": "ELORIA_CUTOUT_URL=bad-url\nELORIA_CUTOUT_TOKEN=test9\n" });
  assert.deepEqual(evaluate(invalid, true, "assert.equal(result.sessionCutout,false);").cutout, { url: "invalid", token: "too-short", valid: false });
  const child = spawnSync(process.execPath, [wrapper, "--local-cutout", process.execPath, "-e", "const assert=require('node:assert/strict');assert.equal(process.env.ELORIA_CUTOUT_URL,'http://127.0.0.1:8765');assert.equal(process.env.ELORIA_CUTOUT_TOKEN.length,96);"], { cwd: empty.dir, env: clean, encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr);
  assert.ok(!/[a-f0-9]{96}/.test(child.stdout + child.stderr), "Generated token is passed privately to children");
  assert.ok(Object.keys(process.env).length === Object.keys(parentEnvironment).length && Object.entries(parentEnvironment).every(([key, value]) => process.env[key] === value), "Parent configuration stays unchanged");
  assert.equal(inspectCutoutConfiguration({ ELORIA_CUTOUT_URL: "http://user:password@example.invalid", ELORIA_CUTOUT_TOKEN: "x".repeat(40) }).url, "invalid");
  console.log("PASS: Next env precedence and expansion; child inheritance; opt-in session-only local setup; existing/partial settings preserved; no file writes or secret output.");
} finally { fs.rmSync(root, { recursive: true, force: true }); }
