import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ELORIA_ORIGINS = [
  "https://github.com/atousaeb7294/eloria.git",
  "https://github.com/atousaeb7294/eloria",
  "git@github.com:atousaeb7294/eloria.git",
  "git@github.com:atousaeb7294/eloria",
];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateUpdatePath(relative) {
  requireCondition(
    typeof relative === "string" &&
      /^[a-zA-Z0-9_.()[\]/-]+$/.test(relative) &&
      !relative.startsWith("/") &&
      relative === path.posix.normalize(relative) &&
      !relative.split("/").includes(".."),
    "The package contains an invalid file path.",
  );
  const parts = relative.toLowerCase().split("/");
  const denied = new Set([
    ".git",
    "node_modules",
    ".next",
    "data",
    "uploads",
    "storage",
    "backups",
    "backup",
    "secrets",
    "credentials",
    "private",
    "logs",
  ]);
  requireCondition(
    !parts.some((part) => denied.has(part) || part.startsWith(".env")) &&
      !/\.(?:db|sqlite\d*|dump|bak|pem|key|pfx|p12)$/i.test(relative) &&
      !/^id_(?:rsa|ed25519)/i.test(parts.at(-1)) &&
      (!relative.endsWith(".sql") ||
        /^prisma\/migrations\/\d+_[\w-]+\/migration\.sql$/.test(relative)),
    "The package tries to change a protected environment, data or credential path.",
  );
}

function statOrNull(filename) {
  try {
    return fs.lstatSync(filename);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function checkNormalPath(root, relative) {
  let current = root;
  const parts = relative.split("/");
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = statOrNull(current);
    if (!stat) continue;
    requireCondition(
      !stat.isSymbolicLink(),
      `A file or directory is a link/junction: ${relative}`,
    );
    requireCondition(
      index === parts.length - 1 ? stat.isFile() : stat.isDirectory(),
      `Unexpected file type: ${relative}`,
    );
  }
}

function gitRunner(root) {
  return (args, { env, allowFailure = false, interactive = false } = {}) => {
    const result = spawnSync(
      "git",
      ["--literal-pathspecs", "-C", root, ...args],
      {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, ...env },
        stdio: interactive
          ? ["inherit", "pipe", "inherit"]
          : ["ignore", "pipe", "pipe"],
      },
    );
    if (result.error) throw result.error;
    if (!allowFailure && result.status !== 0) {
      // Do not echo file contents, environment variables or credential prompts.
      throw new Error(
        `git ${args[0]} failed (exit ${result.status}). ${result.stderr?.trim() || "See the Git message above."}`,
      );
    }
    return { code: result.status, text: result.stdout ?? "" };
  };
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

/** expectedOrigins/log are injectable only for the local Git-fixture tests. */
export function applyUpdate({
  repositoryPath,
  bundlePath,
  push = false,
  branch,
  expectedOrigins = ELORIA_ORIGINS,
  log = console.log,
}) {
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"]) {
    requireCondition(
      !process.env[key],
      `Unset ${key} for this command; no files have been changed.`,
    );
  }
  const root = path.resolve(repositoryPath);
  const bundle = path.resolve(bundlePath);
  requireCondition(
    statOrNull(root)?.isDirectory() && !fs.lstatSync(root).isSymbolicLink(),
    "The target must be an existing normal Git folder. Nothing is cloned or deleted.",
  );
  requireCondition(
    !isWithin(root, bundle),
    "Extract the update ZIP outside the Eloria repository.",
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.join(bundle, "UPDATE-MANIFEST.json"), "utf8"),
  );
  requireCondition(
    manifest.version === 1 &&
      Array.isArray(manifest.files) &&
      manifest.files.length > 0,
    "Invalid update manifest.",
  );
  const files = manifest.files;
  files.forEach(validateUpdatePath);
  requireCondition(
    new Set(files).size === files.length,
    "Duplicate paths in update manifest.",
  );
  const patchFile = path.join(bundle, "eloria-home-update.patch");
  const actualHash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(patchFile))
    .digest("hex");
  requireCondition(
    actualHash === manifest.patchSha256,
    "The patch checksum is invalid. Extract a fresh copy of the ZIP.",
  );
  const git = gitRunner(root);
  const top = git(["rev-parse", "--show-toplevel"]).text.trim();
  requireCondition(
    fs.realpathSync(top) === fs.realpathSync(root),
    "The target is not the root of its Git repository.",
  );
  const origin = git(["remote", "get-url", "origin"]).text.trim();
  requireCondition(
    expectedOrigins.includes(origin),
    "Origin is not the Eloria repository. Nothing has been changed.",
  );
  requireCondition(
    git(["diff", "--cached", "--quiet"], { allowFailure: true }).code === 0,
    "There are already staged changes. Review them first; this updater does not unstage your files.",
  );
  for (const state of [
    "MERGE_HEAD",
    "CHERRY_PICK_HEAD",
    "REVERT_HEAD",
    "rebase-merge",
    "rebase-apply",
  ]) {
    const location = git(["rev-parse", "--git-path", state]).text.trim();
    requireCondition(
      !fs.existsSync(path.resolve(root, location)),
      "Finish the existing Git merge/rebase operation first.",
    );
  }
  const reported = git(["apply", "--numstat", "-z", patchFile])
    .text.split("\0")
    .filter(Boolean)
    .map((row) => row.split("\t").slice(2).join("\t"));
  requireCondition(
    reported.length === files.length &&
      reported.every((f) => files.includes(f)),
    "The patch paths do not match the manifest.",
  );
  const tracked = new Set(git(["ls-files", "-z"]).text.split("\0"));
  for (const file of files) {
    checkNormalPath(root, file);
    requireCondition(
      !statOrNull(path.join(root, file)) || tracked.has(file),
      `An existing untracked file would be replaced: ${file}`,
    );
  }
  const modified = git([
    "diff",
    "--name-only",
    "HEAD",
    "--",
    ...files,
  ]).text.trim();
  requireCondition(
    !modified,
    `Some update files have uncommitted edits. Commit/review them first:\n${modified}`,
  );
  const compatible = git(
    ["apply", "--check", "--index", "--binary", patchFile],
    { allowFailure: true },
  );
  requireCondition(
    compatible.code === 0,
    "This patch conflicts with the current code, or is already applied. Nothing was overwritten; do not force-copy the files.",
  );
  git(["var", "GIT_COMMITTER_IDENT"]);
  const originalHead = git(["rev-parse", "HEAD"]).text.trim();
  const originalBranch = git(["branch", "--show-current"]).text.trim();
  const stamp = new Date().toISOString().replace(/[-:.]/g, "");
  branch ||= `eloria/home-update-${stamp}-${crypto.randomBytes(2).toString("hex")}`;
  requireCondition(
    branch.startsWith("eloria/"),
    "Use a separate branch starting with eloria/.",
  );
  git(["check-ref-format", "--branch", branch]);
  requireCondition(
    git(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], {
      allowFailure: true,
    }).code === 1,
    "The update branch already exists. Use another name.",
  );

  if (push) {
    // Do not accidentally publish unrelated local commits or local secret history.
    git(["fetch", "--no-tags", "origin"], { interactive: true });
    const heads = git(["ls-remote", "--heads", "origin"], { interactive: true })
      .text.trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split(/\s+/));
    requireCondition(
      !heads.some(([, ref]) => ref === `refs/heads/${branch}`),
      "That branch already exists on GitHub; nothing was changed.",
    );
    const published = heads.some(
      ([sha]) =>
        git(["merge-base", "--is-ancestor", originalHead, sha], {
          allowFailure: true,
        }).code === 0,
    );
    requireCondition(
      published,
      "HEAD contains unpublished local commits. They will not be sent automatically. Review/publish them separately first; no code files were changed.",
    );
  }

  const backupRoot = path.join(
    path.dirname(root),
    `${path.basename(root)}-update-backups`,
  );
  fs.mkdirSync(backupRoot, { recursive: true });
  requireCondition(
    !isWithin(fs.realpathSync(root), fs.realpathSync(backupRoot)),
    "The backup folder must be outside the repository.",
  );
  const backup = path.join(
    backupRoot,
    `${stamp}-${crypto.randomBytes(3).toString("hex")}`,
  );
  fs.mkdirSync(backup);
  const receipt = {
    patchSha256: actualHash,
    originalHead,
    originalBranch,
    branch,
    files,
    addedFiles: [],
    status: "prepared",
  };
  const writeReceipt = () =>
    fs.writeFileSync(
      path.join(backup, "UPDATE-RECEIPT.json"),
      JSON.stringify(receipt, null, 2) + "\n",
    );
  for (const file of files) {
    const source = path.join(root, file);
    if (!statOrNull(source)) {
      receipt.addedFiles.push(file);
      continue;
    }
    const saved = path.join(backup, "previous-code", file);
    fs.mkdirSync(path.dirname(saved), { recursive: true });
    fs.copyFileSync(source, saved);
  }
  writeReceipt();
  log(`Code backup: ${backup}`);
  // Predict the exact allowed Git tree in a separate index before any replacement.
  const env = { GIT_INDEX_FILE: path.join(backup, "verification.index") };
  git(["read-tree", originalHead], { env });
  git(["apply", "--cached", "--binary", patchFile], { env });
  const expectedTree = git(["write-tree"], { env }).text.trim();
  requireCondition(
    git(["rev-parse", "HEAD"]).text.trim() === originalHead,
    "HEAD changed during preparation; nothing has been replaced.",
  );
  git(["switch", "-c", branch]);
  git(["apply", "--index", "--binary", patchFile]);
  receipt.status = "applied";
  writeReceipt();
  requireCondition(
    git(["write-tree"]).text.trim() === expectedTree,
    "Unexpected staged files; commit and push stopped. Inspect the index.",
  );
  git(["diff", "--cached", "--check"]);
  requireCondition(
    git(["diff", "--quiet", "--", ...files], { allowFailure: true }).code === 0,
    "Code changed during the update; commit and push stopped.",
  );
  git(
    [
      "commit",
      "-m",
      `Refine Eloria home and managed product display (${actualHash.slice(0, 12)})`,
    ],
    { interactive: true },
  );
  const commit = git(["rev-parse", "HEAD"]).text.trim();
  receipt.status = "commit-created-awaiting-verification";
  receipt.commit = commit;
  writeReceipt();
  requireCondition(
    git(["rev-parse", "HEAD^{tree}"]).text.trim() === expectedTree &&
      git(["rev-parse", "HEAD^"]).text.trim() === originalHead,
    "A commit hook changed the expected commit; push stopped. Review it locally.",
  );
  requireCondition(
    git(["branch", "--show-current"]).text.trim() === branch,
    "The branch changed; push stopped.",
  );
  receipt.status = "committed";
  receipt.commit = commit;
  writeReceipt();
  log(
    `Updated ${files.length} code files. Commit: ${commit}\nBranch: ${branch}`,
  );
  if (push) {
    try {
      git(["push", "--no-follow-tags", "-u", "origin", branch], {
        interactive: true,
      });
    } catch (error) {
      log(
        `Code is committed locally. Retry only the upload:\ngit -C "${root}" push --no-follow-tags -u origin ${branch}`,
      );
      throw error;
    }
    receipt.status = "pushed";
    writeReceipt();
    log(`Uploaded branch ${branch}.`);
  }
  return { backup, branch, commit, files, pushed: push };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = {
      repositoryPath: "C:\\eloria",
      bundlePath: path.dirname(fileURLToPath(import.meta.url)),
      push: false,
    };
    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i];
      if (arg === "--push") options.push = true;
      else if (["--repository", "--package", "--branch"].includes(arg)) {
        const value = process.argv[++i];
        requireCondition(
          value && !value.startsWith("--"),
          `Missing value for ${arg}.`,
        );
        options[
          arg === "--repository"
            ? "repositoryPath"
            : arg === "--package"
              ? "bundlePath"
              : "branch"
        ] = value;
      } else throw new Error(`Unknown argument: ${arg}`);
    }
    applyUpdate(options);
  } catch (error) {
    console.error(`Update stopped: ${error.message}`);
    process.exitCode = 1;
  }
}
