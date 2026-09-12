import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, createDecipheriv } from "node:crypto";
import { backupDatabase, restoreCheck } from "./backup-database.mjs";
if (process.platform === "win32") {
  console.log(
    "SKIP: backup executable fixture requires Unix; run this test on the Linux monitoring host.",
  );
  process.exit(0);
}
const dir = await mkdtemp(join(tmpdir(), "eloria-backup-test-"));
try {
  const dump = join(dir, "pg-dump-fixture");
  await writeFile(
    dump,
    `#!${process.execPath}\nprocess.stdout.write('PGDMP-test-fixture');\n`,
    { mode: 0o700 },
  );
  Object.assign(process.env, {
    DIRECT_URL: "postgresql://dummy:dummy@localhost:5432/source",
    ELORIA_BACKUP_DIR: dir,
    ELORIA_BACKUP_KEY: randomBytes(32).toString("hex"),
    PG_DUMP_BIN: dump,
  });
  const file = await backupDatabase();
  const bytes = await readFile(file);
  assert(!bytes.includes(Buffer.from("PGDMP")));
  const meta = JSON.parse(await readFile(file + ".json", "utf8"));
  function decode(content) {
    const d = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.ELORIA_BACKUP_KEY, "hex"),
      Buffer.from(meta.iv, "hex"),
    );
    d.setAuthTag(Buffer.from(meta.tag, "hex"));
    return Buffer.concat([d.update(content), d.final()]);
  }
  assert.equal(decode(bytes).toString(), "PGDMP-test-fixture");
  const corrupt = Buffer.from(bytes);
  corrupt[0] ^= 1;
  assert.throws(() => decode(corrupt));
  await assert.rejects(restoreCheck(file), /confirmation/);
  process.argv.push("--confirm-empty-test-database");
  process.env.ELORIA_RESTORE_TEST_URL = process.env.DIRECT_URL;
  await assert.rejects(restoreCheck(file), /different/);
  await writeFile(
    dump,
    `#!${process.execPath}\nprocess.stdout.write('partial');process.exitCode=1;\n`,
    { mode: 0o700 },
  );
  await assert.rejects(backupDatabase(), /did not complete/);
  assert(!(await readdir(dir)).some((f) => f.endsWith(".partial")));
  console.log(
    "PASS: streaming encrypted backup, authenticated corruption rejection, failed dump cleanup, restore confirmation and production-name guard. PostgreSQL itself mocked.",
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
