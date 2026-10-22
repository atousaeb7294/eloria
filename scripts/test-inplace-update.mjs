import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { applyUpdate, validateUpdatePath } from "./apply-home-update.mjs";

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "eloria-inplace-tests-"),
);
let count = 0;
function git(root, ...args) {
  return execFileSync("git", ["--literal-pathspecs", "-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
function write(root, name, text) {
  fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
  fs.writeFileSync(path.join(root, name), text);
}
function fixture() {
  const folder = path.join(temporaryRoot, String(++count));
  const root = path.join(folder, "eloria");
  const bundle = path.join(folder, "package");
  const remote = path.join(folder, "remote.git");
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(bundle);
  execFileSync("git", ["init", "--bare", remote], { stdio: "pipe" });
  git(root, "init", "-b", "main");
  git(root, "config", "user.name", "Eloria Update Test");
  git(root, "config", "user.email", "test@example.invalid");
  git(root, "config", "core.autocrlf", "false");
  git(root, "config", "commit.gpgsign", "false");
  write(root, ".gitignore", ".env*\nuploads/\ndata/\n");
  write(root, "src/app/[locale]/page.tsx", "export const circle = false;\n");
  write(root, "unrelated.txt", "original unrelated file\n");
  git(root, "add", ".");
  git(root, "commit", "-m", "Published base");
  git(root, "remote", "add", "origin", remote);
  git(root, "push", "-u", "origin", "main");
  const originalHead = git(root, "rev-parse", "HEAD").trim();
  write(root, "src/app/[locale]/page.tsx", "export const circle = true;\n");
  write(root, "src/new-card.css", ".card { border-radius: 50%; }\n");
  git(root, "add", "--intent-to-add", "src/new-card.css");
  const patch = git(root, "diff", "--binary", "--full-index");
  // Reset only this disposable fixture back to its published test base.
  git(root, "reset", "--hard", "HEAD");
  const files = ["src/app/[locale]/page.tsx", "src/new-card.css"];
  write(bundle, "eloria-home-update.patch", patch);
  write(
    bundle,
    "UPDATE-MANIFEST.json",
    JSON.stringify({
      version: 1,
      files,
      patchSha256: crypto.createHash("sha256").update(patch).digest("hex"),
    }),
  );
  const sensitive = {
    ".env": "PRIVATE_TEST_TOKEN=keep-original\n",
    ".env.production.local": "PRIVATE_TEST_DATABASE=keep-original\n",
    "uploads/bracelet.jpg": Buffer.from([0, 255, 31, 100, 82]),
    "data/customers.sqlite": Buffer.from([11, 22, 33, 44]),
  };
  for (const [name, data] of Object.entries(sensitive)) write(root, name, data);
  const options = {
    repositoryPath: root,
    bundlePath: bundle,
    push: true,
    expectedOrigins: [remote],
    branch: "eloria/test-update",
    log: () => {},
  };
  return { root, bundle, remote, originalHead, sensitive, files, options };
}
function unchangedSensitive(f) {
  for (const [name, content] of Object.entries(f.sensitive))
    assert.deepEqual(
      fs.readFileSync(path.join(f.root, name)),
      Buffer.from(content),
      name,
    );
}

const success = fixture();
write(success.root, "unrelated.txt", "keep this local uncommitted edit\n");
const result = applyUpdate(success.options);
unchangedSensitive(success);
assert.equal(
  fs.readFileSync(path.join(success.root, "unrelated.txt"), "utf8"),
  "keep this local uncommitted edit\n",
);
assert.deepEqual(
  git(success.root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD")
    .trim()
    .split("\n")
    .sort(),
  success.files.sort(),
);
assert.equal(
  git(success.remote, "rev-parse", "refs/heads/eloria/test-update").trim(),
  result.commit,
);
assert.equal(
  git(success.root, "show", "HEAD:unrelated.txt"),
  "original unrelated file\n",
);
assert.equal(
  fs.readFileSync(
    path.join(result.backup, "previous-code/src/app/[locale]/page.tsx"),
    "utf8",
  ),
  "export const circle = false;\n",
);
assert.equal(
  fs.existsSync(path.join(result.backup, "previous-code/.env")),
  false,
);

const dirty = fixture();
write(dirty.root, "src/app/[locale]/page.tsx", "keep my unfinished page\n");
assert.throws(() => applyUpdate(dirty.options), /uncommitted edits/);
assert.equal(
  fs.readFileSync(path.join(dirty.root, "src/app/[locale]/page.tsx"), "utf8"),
  "keep my unfinished page\n",
);
assert.equal(git(dirty.root, "rev-parse", "HEAD").trim(), dirty.originalHead);
unchangedSensitive(dirty);

const staged = fixture();
git(staged.root, "add", "-f", ".env");
assert.throws(() => applyUpdate(staged.options), /already staged/);
assert.equal(
  git(staged.root, "diff", "--cached", "--name-only").trim(),
  ".env",
);
unchangedSensitive(staged);

const collision = fixture();
write(collision.root, "src/new-card.css", "keep my existing untracked CSS\n");
assert.throws(() => applyUpdate(collision.options), /untracked file/);
assert.equal(
  fs.readFileSync(path.join(collision.root, "src/new-card.css"), "utf8"),
  "keep my existing untracked CSS\n",
);

const corrupt = fixture();
fs.appendFileSync(
  path.join(corrupt.bundle, "eloria-home-update.patch"),
  "corrupt\n",
);
assert.throws(() => applyUpdate(corrupt.options), /checksum/);
assert.equal(
  git(corrupt.root, "rev-parse", "HEAD").trim(),
  corrupt.originalHead,
);

const unpublished = fixture();
write(unpublished.root, "unrelated.txt", "unpublished change\n");
git(unpublished.root, "add", "unrelated.txt");
git(unpublished.root, "commit", "-m", "Unpublished local work");
assert.throws(
  () => applyUpdate(unpublished.options),
  /unpublished local commits/,
);
assert.equal(
  fs.readFileSync(
    path.join(unpublished.root, "src/app/[locale]/page.tsx"),
    "utf8",
  ),
  "export const circle = false;\n",
);

for (const filename of [
  ".env",
  ".env.production",
  ".env.example",
  "public/uploads/photo.webp",
  "data/store.db",
  "secrets/service.key",
  "../escape",
  "C:/escape",
  ".git/config",
]) {
  assert.throws(() => validateUpdatePath(filename));
}
if (process.platform !== "win32") {
  const linked = fixture();
  fs.symlinkSync(
    path.join(linked.root, ".env"),
    path.join(linked.root, "src/new-card.css"),
  );
  assert.throws(() => applyUpdate(linked.options), /link\/junction/);
  unchangedSensitive(linked);

  const hook = fixture();
  write(hook.root, "hook-extra.txt", "not approved for upload\n");
  write(
    hook.root,
    ".git/hooks/pre-commit",
    "#!/bin/sh\ngit add hook-extra.txt\n",
  );
  fs.chmodSync(path.join(hook.root, ".git/hooks/pre-commit"), 0o755);
  assert.throws(() => applyUpdate(hook.options), /hook changed/);
  assert.equal(
    git(
      hook.remote,
      "ls-remote",
      "--heads",
      hook.remote,
      "eloria/test-update",
    ).trim(),
    "",
  );
  unchangedSensitive(hook);
}
console.log(
  "In-place updater passed: local Git push, exact changed-file commit, backups, preserved env/data/unrelated edits, conflict/staged/collision/hash/history/path/hook guards.",
);
console.log(`Disposable test evidence: ${temporaryRoot}`);
