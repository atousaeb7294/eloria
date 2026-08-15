import { randomUUID } from "node:crypto";
import { databasePool, prisma } from "./src/lib/prisma";

async function main() {
  console.log("\n=== 1. CUSTOMERS TABLE DEFINITION ===");

  const columns = await databasePool.query(`
    SELECT
      ordinal_position,
      column_name,
      is_nullable,
      column_default,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
    ORDER BY ordinal_position
  `);

  console.table(columns.rows);

  const suffix = String(Date.now()).slice(-7);

  console.log("\n=== 2. RAW POSTGRES INSERT USING DATABASE DEFAULTS ===");

  const rawMobile = `0900${suffix}`;

  try {
    const result = await databasePool.query(
      `
        INSERT INTO customers (
          "mobile",
          "fullName",
          "mobileVerifiedAt"
        )
        VALUES ($1, $2, NOW())
        RETURNING
          "id",
          "mobile",
          "isActive",
          "createdAt",
          "updatedAt"
      `,
      [rawMobile, "RAW P2011 Audit"],
    );

    console.log("PASS RAW DEFAULT INSERT");
    console.log(result.rows[0]);

    await databasePool.query(
      `DELETE FROM customers WHERE "mobile" = $1`,
      [rawMobile],
    );
  } catch (error) {
    console.log("FAIL RAW DEFAULT INSERT");
    console.dir(error, { depth: 10 });
  }

  console.log("\n=== 3. PRISMA MINIMAL CREATE ===");

  const prismaMobile =
    `0901${String(Date.now() + 1).slice(-7)}`;

  try {
    const customer =
      await prisma.customer.create({
        data: {
          mobile: prismaMobile,
          fullName: "PRISMA MINIMAL Audit",
          mobileVerifiedAt: new Date(),
        },
      });

    console.log("PASS PRISMA MINIMAL CREATE");
    console.log({
      id: customer.id,
      mobile: customer.mobile,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    });

    await prisma.customer.delete({
      where: {
        id: customer.id,
      },
    });
  } catch (error) {
    console.log("FAIL PRISMA MINIMAL CREATE");
    console.dir(error, { depth: 10 });
  }

  console.log("\n=== 4. PRISMA CREATE WITH ALL REQUIRED VALUES ===");

  const explicitMobile =
    `0902${String(Date.now() + 2).slice(-7)}`;

  const now = new Date();

  try {
    const customer =
      await prisma.customer.create({
        data: {
          id: randomUUID(),
          mobile: explicitMobile,
          fullName: "PRISMA EXPLICIT Audit",
          mobileVerifiedAt: now,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      });

    console.log("PASS PRISMA EXPLICIT CREATE");
    console.log({
      id: customer.id,
      mobile: customer.mobile,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    });

    await prisma.customer.delete({
      where: {
        id: customer.id,
      },
    });
  } catch (error) {
    console.log("FAIL PRISMA EXPLICIT CREATE");
    console.dir(error, { depth: 10 });
  }
}

main()
  .catch((error) => {
    console.error("DIAGNOSTIC FAILED");
    console.dir(error, { depth: 10 });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await databasePool.end().catch(() => undefined);
  });
