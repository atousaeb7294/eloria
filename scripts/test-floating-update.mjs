import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { applyFloatingUpdate } from "./apply-floating-home-update.mjs";
import { checkCutoutHealth } from "./check-cutout-health.mjs";

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "eloria-floating-test-"));
let count = 0;
function fixture(previous = false) {
  const dir = path.join(temporary, String(++count));
  const root = path.join(dir, "eloria");
  const bundle = path.join(dir, "package");
  fs.mkdirSync(root, { recursive: true }); fs.mkdirSync(bundle);
  const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-b", "main"); git("config", "user.name", "Update test"); git("config", "user.email", "test@example.invalid"); git("config", "core.autocrlf", "false");
  git("config", "commit.gpgsign", "false"); git("remote", "add", "origin", "https://github.com/atousaeb7294/eloria.git");
  fs.writeFileSync(path.join(root, ".gitignore"), ".env*\nuploads/\n");
  fs.writeFileSync(path.join(root, "home.txt"), "original photo\n");
  fs.writeFileSync(path.join(root, "unrelated.txt"), "original\n");
  git("add", "."); git("commit", "-m", "Base");
  const base = git("rev-parse", "HEAD").trim();
  fs.writeFileSync(path.join(root, "home.txt"), "old 3d workflow\n");
  fs.writeFileSync(path.join(root, "old-model.txt"), "old model worker\n");
  git("add", "."); git("commit", "-m", "Earlier package");
  const old = git("rev-parse", "HEAD").trim();
  fs.writeFileSync(path.join(root, "home.txt"), "transparent floating photo\n");
  fs.unlinkSync(path.join(root, "old-model.txt"));
  fs.writeFileSync(path.join(root, "floating.txt"), "small motion\n");
  git("add", "."); git("commit", "-m", "Current package");
  const updates = [[old, "previous-update.patch"], [base, "original-update.patch"]].map(([ref, patch]) => {
    const body = git("diff", "--binary", "--no-renames", ref, "HEAD");
    fs.writeFileSync(path.join(bundle, patch), body);
    return { patch, sha256: crypto.createHash("sha256").update(body).digest("hex"), files: git("diff", "--name-only", "--no-renames", ref, "HEAD").trim().split("\n") };
  });
  fs.writeFileSync(path.join(bundle, "FLOATING-UPDATE.json"), JSON.stringify({ version: 1, updates }));
  // Reset only the disposable fixture; production updater never runs reset.
  git("reset", "--hard", previous ? old : base);
  if (previous === "uncommitted") git("reset", "--mixed", base);
  fs.writeFileSync(path.join(root, ".env"), "TOKEN=private-test-value\n");
  fs.writeFileSync(path.join(root, "unrelated.txt"), "keep my unrelated work\n");
  fs.mkdirSync(path.join(root, "uploads"));
  fs.writeFileSync(path.join(root, "uploads", "original.jpg"), Buffer.from([3, 10, 42]));
  return { root, bundle, git, options: { repositoryPath: root, bundlePath: bundle, log: () => {} } };
}
try {
  for (const previous of [false, true, "uncommitted"]) {
    const f = fixture(previous);
    const head = f.git("rev-parse", "HEAD");
    const result = applyFloatingUpdate(f.options);
    assert.equal(result.alreadyApplied, false);
    assert.equal(fs.readFileSync(path.join(f.root, "home.txt"), "utf8"), "transparent floating photo\n");
    assert.equal(fs.readFileSync(path.join(f.root, ".env"), "utf8"), "TOKEN=private-test-value\n");
    assert.equal(fs.readFileSync(path.join(f.root, "unrelated.txt"), "utf8"), "keep my unrelated work\n");
    assert.deepEqual(fs.readFileSync(path.join(f.root, "uploads", "original.jpg")), Buffer.from([3, 10, 42]));
    assert.equal(f.git("rev-parse", "HEAD"), head, "No automatic commit");
    assert.equal(f.git("diff", "--cached", "--name-only").trim(), "", "No staging");
    assert.equal(fs.existsSync(path.join(result.backup, "previous-code", ".env")), false);
    assert.equal(applyFloatingUpdate(f.options).alreadyApplied, true, "Can rerun after a later installation step fails");
  }
  const conflict = fixture();
  fs.writeFileSync(path.join(conflict.root, "home.txt"), "my unfinished design\n");
  assert.throws(() => applyFloatingUpdate(conflict.options), /conflicts/);
  assert.equal(fs.readFileSync(path.join(conflict.root, "home.txt"), "utf8"), "my unfinished design\n");
  const crlf = fixture();
  crlf.git("config", "core.autocrlf", "true");
  fs.writeFileSync(path.join(crlf.root, "home.txt"), "original photo\r\n");
  applyFloatingUpdate(crlf.options);
  assert.equal(fs.readFileSync(path.join(crlf.root, "home.txt"), "utf8").replaceAll("\r\n", "\n"), "transparent floating photo\n");
  assert.equal(applyFloatingUpdate(crlf.options).alreadyApplied, true);
  const staged = fixture();
  staged.git("rm", "--cached", "home.txt");
  assert.throws(() => applyFloatingUpdate(staged.options), /staged/);
  const corrupt = fixture();
  fs.appendFileSync(path.join(corrupt.bundle, "original-update.patch"), "corrupt");
  assert.throws(() => applyFloatingUpdate(corrupt.options), /checksum/);
  const collision = fixture();
  fs.writeFileSync(path.join(collision.root, "floating.txt"), "my existing file\n");
  assert.throws(() => applyFloatingUpdate(collision.options), /conflicts/);
  if (process.platform !== "win32") {
    const link = fixture();
    fs.symlinkSync(path.join(link.root, ".env"), path.join(link.root, "floating.txt"));
    assert.throws(() => applyFloatingUpdate(link.options), /link/);
  }
  const env = { ELORIA_CUTOUT_URL: "http://127.0.0.1:8765", ELORIA_CUTOUT_TOKEN: "test-only-token".repeat(4) };
  assert.equal(await checkCutoutHealth(env, async () => new Response('{"ready":true}')), 0);
  assert.equal(await checkCutoutHealth(env, async () => new Response("ready")), 0, "Reuse the existing worker health format");
  assert.equal(await checkCutoutHealth(env, async () => { throw new Error("offline"); }), 2);
  assert.equal(await checkCutoutHealth({ ...env, ELORIA_CUTOUT_URL: "https://worker.example.invalid" }, async () => new Response("", { status: 503 })), 3);
  assert.equal(await checkCutoutHealth({}), 4);
  console.log("PASS: original and previous packages; rerun; preserved env/uploads/local edits/index/history; conflict/hash/link guards; local/remote worker checks.");
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
