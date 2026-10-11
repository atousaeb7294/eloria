import * as nextenv from "@next/env";
nextenv.loadEnvConfig(process.cwd());

async function main() {
  const { databasePool, checkoutDatabasePool } = await import("../src/lib/prisma");
  const entries = [["primary", databasePool], ["checkout", checkoutDatabasePool]] as const;
  let failed = false;
  try {
    for (const [name, pool] of entries) {
      try {
        await pool.query("SELECT 1");
        console.log(`PASS ${name}: database reachable, authenticated, query succeeded`);
        try {
          const result = await pool.query("SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()");
          console.log(`INFO ${name}: connection TLS=${result.rows[0]?.ssl ?? "unknown"}`);
        } catch {
          console.log(`INFO ${name}: TLS status view unavailable; query check passed`);
        }
      } catch (error) {
        failed = true;
        const item = error as { code?: string; message?: string };
        const code = typeof item.code === "string" && /^[A-Z0-9_]{2,64}$/.test(item.code) ? item.code : "CONNECTION_FAILED";
        const detail = /certificate|self.signed|hostname.*cert/i.test(item.message ?? "")
          ? "certificate verification failed; check trusted CA and host configuration"
          : /does not support ssl/i.test(item.message ?? "")
            ? "server does not offer TLS; use the hosting provider's configured transport"
            : "check network, service status, credentials and configured transport";
        console.error(`FAIL ${name}: ${code}; ${detail}`);
      }
    }
  } finally {
    await Promise.all([...new Set(entries.map(([, pool]) => pool))].map(pool => pool.end()));
  }
  process.exitCode = failed ? 1 : 0;
}
main().catch(() => {
  console.error("FAIL database configuration could not be initialized; check required URLs and SSL mode locally. No credentials are printed.");
  process.exitCode = 1;
});
