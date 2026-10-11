import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { databaseBackupConnection } from "./backup-database.mjs";
const require = createRequire(import.meta.url);
const { databaseSslOptions, resolveDatabaseSslMode } = require("../src/lib/database-ssl.ts");
const url = "postgresql://test:test@internal-db/test";
assert.deepEqual(databaseSslOptions(url), { rejectUnauthorized: true });
assert.equal(databaseSslOptions(url, "disable"), false);
assert.deepEqual(databaseSslOptions(url, "require"), { rejectUnauthorized: false });
assert.deepEqual(databaseSslOptions(url + "?sslmode=require", "verify-full"), { rejectUnauthorized: true });
assert.equal(databaseSslOptions(url + "?sslmode=verify-full", "disable"), false);
assert.equal(resolveDatabaseSslMode(url + "?sslmode=disable"), "disable");
assert.equal(resolveDatabaseSslMode(url, " REQUIRE "), "require");
assert.throws(() => databaseSslOptions(url, "typo"), /Unsupported/);
assert.equal(databaseSslOptions(url, "verify-full", "a\\nb").ca, "a\nb");
const caOnly = databaseSslOptions(url, "verify-ca", "trusted-ca");
assert.equal(caOnly.rejectUnauthorized, true);
assert.equal(caOnly.checkServerIdentity("host", {}), undefined);
assert.equal(databaseSslOptions(url, "verify-full").checkServerIdentity, undefined);
assert.equal(databaseBackupConnection(url, {}).PGSSLMODE, "verify-full");
assert.equal(databaseBackupConnection(url, { DATABASE_SSL_MODE: "disable" }).PGSSLMODE, "disable");
assert.equal(databaseBackupConnection(url + "?sslmode=require", { DATABASE_SSL_MODE: "disable" }).PGSSLMODE, "require");
assert.equal(databaseBackupConnection(url + "?sslmode=require", { ELORIA_BACKUP_SSL_MODE: "verify-full" }).PGSSLMODE, "verify-full");
assert.throws(() => databaseBackupConnection(url, { PGSSLMODE: "typo" }), /Unsupported/);

// The actual operator-facing checker must parse escaped dollars exactly as Next.
const dir = mkdtempSync(join(tmpdir(), "eloria-env-loader-"));
try {
  const hash = "scrypt$" + "a".repeat(32) + "$" + "b".repeat(128);
  writeFileSync(join(dir, ".env"), "ELORIA_ADMIN_PASSWORD_HASH=" + hash.replaceAll("$", "\\$") + "\nDATABASE_SSL_MODE=disable\n");
  const env = { ...process.env, NODE_ENV: "production" };
  delete env.ELORIA_ADMIN_PASSWORD_HASH;
  delete env.DATABASE_SSL_MODE;
  const result = spawnSync(process.execPath, ["--import", require("node:url").pathToFileURL(require.resolve("tsx")).href, resolve("scripts/check-production-env.ts")], { cwd: dir, env, encoding: "utf8", timeout: 20000 });
  assert.match(result.stdout, /OK\s+ELORIA_ADMIN_PASSWORD_HASH\s/);
  assert.match(result.stdout, /OK\s+DATABASE_SSL_MODE\s/);
  assert.match(result.stdout, /WARN\s+DATABASE_TLS_VERIFICATION\s/);
  assert.ok(!result.stdout.includes(hash));
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log("PASS explicit DB SSL modes, URL precedence, no silent fallback, CA options, backup modes and real Next env loader");

