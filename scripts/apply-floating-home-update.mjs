import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateUpdatePath } from "./apply-home-update.mjs";

const origins = ["https://github.com/atousaeb7294/eloria", "https://github.com/atousaeb7294/eloria.git", "git@github.com:atousaeb7294/eloria", "git@github.com:atousaeb7294/eloria.git"];
function ensure(condition, message) { if (!condition) throw new Error(message); }
function normalPath(root, relative) {
  let current = root;
  const parts = relative.split("/");
  for (const [i, part] of parts.entries()) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    ensure(!stat.isSymbolicLink() && (i === parts.length - 1 ? stat.isFile() : stat.isDirectory()), `Unexpected file or link: ${relative}`);
  }
}

/** Apply either the original-repository update or the replacement for the previous package.
 * Never reset, stash, stage, commit, push, overwrite conflicts, or access env contents.
 */
export function applyFloatingUpdate({ repositoryPath, bundlePath, expectedOrigins = origins, log = console.log }) {
  for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"])
    ensure(!process.env[name], `Unset ${name} before updating.`);
  const root = fs.realpathSync(repositoryPath);
  const bundle = fs.realpathSync(bundlePath);
  const run = args => {
    const result = spawnSync("git", ["--literal-pathspecs", "-C", root, ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    if (result.error) throw result.error;
    return result;
  };
  const git = args => {
    const result = run(args);
    ensure(result.status === 0, `Git ${args[0]} failed. No conflicting files were overwritten.`);
    return result.stdout.trim();
  };
  ensure(fs.realpathSync(git(["rev-parse", "--show-toplevel"])) === root, "Select the Eloria repository root.");
  ensure(expectedOrigins.includes(git(["remote", "get-url", "origin"])), "This is not the Eloria repository.");
  for (const state of ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"])
    ensure(!fs.existsSync(path.resolve(root, git(["rev-parse", "--git-path", state]))), "Finish the current Git merge/rebase before updating.");
  const manifest = JSON.parse(fs.readFileSync(path.join(bundle, "FLOATING-UPDATE.json"), "utf8"));
  ensure(manifest.version === 1 && Array.isArray(manifest.updates) && manifest.updates.length > 0, "Invalid update package.");
  for (const update of manifest.updates) {
    ensure(/^[a-z-]+\.patch$/.test(update.patch) && Array.isArray(update.files) && update.files.length > 0, "Invalid update entry.");
    update.files.forEach(validateUpdatePath);
    ensure(new Set(update.files).size === update.files.length, "Duplicate update paths.");
    const filename = path.join(bundle, update.patch);
    normalPath(bundle, update.patch);
    ensure(crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex") === update.sha256, "Update checksum failed. Download the ZIP again.");
    const result = run(["apply", "--numstat", "-z", filename]);
    ensure(result.status === 0, "Invalid patch.");
    const files = result.stdout.split("\0").filter(Boolean).map(row => row.split("\t").slice(2).join("\t"));
    ensure(files.length === update.files.length && files.every(file => update.files.includes(file)), "Patch paths do not match the package.");
    for (const file of files) normalPath(root, file);
  }
  if (manifest.updates.some(update => run(["apply", "--reverse", "--check", path.join(bundle, update.patch)]).status === 0)) {
    log("The floating-photo update is already applied. Continuing installation.");
    return { alreadyApplied: true };
  }
  const update = manifest.updates.find(item => run(["apply", "--check", path.join(bundle, item.patch)]).status === 0);
  ensure(update, "This package conflicts with local edits or a different version. Nothing was overwritten. Send this message for a matching update.");
  const staged = git(["diff", "--cached", "--name-only", "--", ...update.files]);
  ensure(!staged, "Some affected files are staged. Review those changes before updating.");
  const backupParent = path.join(path.dirname(root), `${path.basename(root)}-update-backups`);
  if (fs.existsSync(backupParent)) ensure(!fs.lstatSync(backupParent).isSymbolicLink(), "Backup folder must not be a link.");
  fs.mkdirSync(backupParent, { recursive: true });
  const backup = fs.mkdtempSync(path.join(backupParent, "floating-"));
  for (const file of update.files) {
    const original = path.join(root, file);
    if (!fs.existsSync(original)) continue;
    const destination = path.join(backup, "previous-code", file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(original, destination);
  }
  fs.writeFileSync(path.join(backup, "receipt.json"), JSON.stringify({ head: git(["rev-parse", "HEAD"]), patch: update.patch, sha256: update.sha256, files: update.files }, null, 2));
  git(["apply", "--binary", path.join(bundle, update.patch)]);
  log(`Floating-photo update applied. Previous code: ${backup}`);
  return { alreadyApplied: false, backup };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    applyFloatingUpdate({ repositoryPath: process.argv[2] ?? "C:\\eloria", bundlePath: path.dirname(fileURLToPath(import.meta.url)) });
  } catch (error) {
    console.error(`Update stopped: ${error.message}`);
    process.exitCode = 1;
  }
}
