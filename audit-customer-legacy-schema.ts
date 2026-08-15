import { databasePool, prisma } from "./src/lib/prisma";

const tables = [
  "customers",
  "customer_sessions",
  "customer_otp_challenges",
  "customer_addresses",
  "customer_favorites",
  "customer_notifications",
  "orders",
];

async function main() {
  console.log("\n========================================");
  console.log("ELORIA CUSTOMER LEGACY SCHEMA AUDIT");
  console.log("========================================");

  for (const table of tables) {
    console.log(`\n\n=== TABLE: ${table} ===`);

    const exists = await databasePool.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = $1
        ) AS exists
      `,
      [table],
    );

    if (!exists.rows[0]?.exists) {
      console.log("TABLE DOES NOT EXIST");
      continue;
    }

    const columns = await databasePool.query(
      `
        SELECT
          ordinal_position,
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position
      `,
      [table],
    );

    console.table(columns.rows);

    const constraints = await databasePool.query(
      `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
        ORDER BY
          tc.constraint_type,
          tc.constraint_name,
          kcu.ordinal_position
      `,
      [table],
    );

    console.log("--- CONSTRAINTS ---");
    console.table(constraints.rows);

    const count = await databasePool.query(
      `SELECT COUNT(*)::int AS count FROM "${table}"`
    );

    console.log("ROW COUNT:", count.rows[0]?.count ?? "?");
  }

  console.log("\n\n=== CUSTOMER RELATED COLUMNS IN ORDERS ===");

  const orderColumns = await databasePool.query(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND (
        lower(column_name) LIKE '%customer%'
        OR lower(column_name) LIKE '%mobile%'
        OR lower(column_name) LIKE '%address%'
      )
    ORDER BY ordinal_position
  `);

  console.table(orderColumns.rows);

  console.log("\nCUSTOMER LEGACY SCHEMA AUDIT COMPLETE");
}

main()
  .catch((error) => {
    console.error("AUDIT FAILED");
    console.dir(error, { depth: 10 });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await databasePool.end().catch(() => undefined);
  });
