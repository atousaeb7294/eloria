import { databasePool } from "./src/lib/prisma";

async function main() {
  const result = await databasePool.query(`
    SELECT
      current_database() AS database,
      inet_server_addr() AS host,
      inet_server_port() AS port,
      version() AS version
  `);

  console.log(result.rows[0]);
  await databasePool.end();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await databasePool.end();
  } catch {}
  process.exit(1);
});
