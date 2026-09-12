import "dotenv/config";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";
import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  unlink,
  mkdtemp,
} from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { join, resolve, relative, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
function connection(raw) {
  const u = new URL(raw);
  if (!["postgresql:", "postgres:"].includes(u.protocol))
    throw Error("PostgreSQL URL required");
  return {
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGDATABASE: decodeURIComponent(u.pathname.slice(1)),
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGSSLMODE: u.searchParams.get("sslmode") || "require",
  };
}
function run(binary, args, env) {
  return new Promise((ok, fail) => {
    const child = spawn(binary, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.once("error", () => fail(Error("PostgreSQL client unavailable")));
    child.once("exit", (code) =>
      code === 0 ? ok() : fail(Error("PostgreSQL command failed")),
    );
  });
}
function key() {
  const value = process.env.ELORIA_BACKUP_KEY || "";
  if (!/^[0-9a-f]{64}$/i.test(value))
    throw Error("ELORIA_BACKUP_KEY must be 32 random bytes in hex");
  return Buffer.from(value, "hex");
}
export async function backupDatabase() {
  const env = connection(process.env.DIRECT_URL || "");
  const secret = key();
  const directory = resolve(process.env.ELORIA_BACKUP_DIR || "");
  if (!process.env.ELORIA_BACKUP_DIR)
    throw Error("Set a private backup directory outside the project");
  const relativeDirectory = relative(process.cwd(), directory);
  if (!relativeDirectory || (!relativeDirectory.startsWith("..") && !isAbsolute(relativeDirectory))) throw Error("Backup directory must be outside the project working directory");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = join(
    directory,
    `eloria-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(4).toString("hex")}.enc`,
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  const child = spawn(
    process.env.PG_DUMP_BIN || "pg_dump",
    ["--format=custom", "--no-owner", "--no-acl"],
    { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "ignore"] },
  );
  const timeout = setTimeout(() => child.kill("SIGTERM"), 15 * 60_000);
  const done = new Promise((ok, fail) => {
    child.once("error", () => fail(Error("pg_dump unavailable")));
    child.once("exit", (code) =>
      code === 0 ? ok() : fail(Error("pg_dump failed")),
    );
  });
  try {
    await Promise.all([
      done,
      pipeline(
        child.stdout,
        cipher,
        createWriteStream(file + ".partial", { flags: "wx", mode: 0o600 }),
      ),
    ]);
    await rename(file + ".partial", file);
    await writeFile(
      file + ".json",
      JSON.stringify({
        version: 1,
        createdAt: new Date().toISOString(),
        iv: iv.toString("hex"),
        tag: cipher.getAuthTag().toString("hex"),
      }),
      { flag: "wx", mode: 0o600 },
    );
    return file;
  } catch {
    child.kill();
    await unlink(file + ".partial").catch(() => {});
    throw Error("Backup did not complete");
  } finally {
    clearTimeout(timeout);
  }
}
export async function restoreCheck(file) {
  if (!process.argv.includes("--confirm-empty-test-database"))
    throw Error("Explicit empty test database confirmation required");
  const source = connection(process.env.DIRECT_URL || ""),
    target = connection(process.env.ELORIA_RESTORE_TEST_URL || "");
  if (
    target.PGDATABASE === source.PGDATABASE ||
    !/(?:test|restore|sandbox)/i.test(target.PGDATABASE)
  )
    throw Error("Use a different test/restore database name");
  const pg = await import("pg");
  const client = new pg.Client({
    connectionString: process.env.ELORIA_RESTORE_TEST_URL,
  });
  await client.connect();
  try {
    const result = await client.query(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')",
    );
    if (result.rows[0].n !== 0) throw Error("Restore target must be empty");
  } finally {
    await client.end();
  }
  const meta = JSON.parse(await readFile(file + ".json", "utf8"));
  if (meta.version !== 1) throw Error("Unsupported backup");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(meta.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(meta.tag, "hex"));
  const directory = await mkdtemp(join(tmpdir(), "eloria-restore-"));
  const plain = join(directory, "test.dump");
  try {
    await pipeline(
      createReadStream(file),
      decipher,
      createWriteStream(plain, { flags: "wx", mode: 0o600 }),
    );
    await run(
      process.env.PG_RESTORE_BIN || "pg_restore",
      [
        "--exit-on-error",
        "--single-transaction",
        "--no-owner",
        "--no-acl",
        "--dbname",
        target.PGDATABASE,
        plain,
      ],
      target,
    );
    const verify = new pg.Client({
      connectionString: process.env.ELORIA_RESTORE_TEST_URL,
    });
    await verify.connect();
    try {
      await verify.query("SELECT count(*) FROM orders");
      await verify.query("SELECT count(*) FROM products");
    } finally {
      await verify.end();
    }
    await writeFile(
      file + ".restore-verified.json",
      JSON.stringify({
        verifiedAt: new Date().toISOString(),
        testDatabaseHash: createHash("sha256")
          .update(target.PGDATABASE)
          .digest("hex"),
      }),
      { mode: 0o600 },
    );
  } finally {
    await unlink(plain).catch(() => {});
    const { rmdir } = await import("node:fs/promises");
    await rmdir(directory).catch(() => {});
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (process.argv[2] === "restore-check")
      await restoreCheck(resolve(process.argv[3] || ""));
    else if (process.argv[2] === "backup") await backupDatabase();
    else
      throw Error(
        "Use backup or restore-check FILE --confirm-empty-test-database",
      );
    console.log("Operation completed successfully.");
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
