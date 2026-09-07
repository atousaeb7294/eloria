import "dotenv/config";

import {
  existsSync,
  readFileSync,
  unlinkSync,
} from "node:fs";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  databasePool,
  prisma,
} from "../src/lib/prisma";

const TRACK_FILE =
  join(
    tmpdir(),
    "eloria-e2e-runtime.jsonl",
  );

type TrackedValue = {
  type:
    | "mobile"
    | "order";

  value:
    string;
};

function readTracked(): TrackedValue[] {
  if (
    !existsSync(
      TRACK_FILE,
    )
  ) {
    return [];
  }

  return readFileSync(
    TRACK_FILE,
    "utf8",
  )
    .split(
      /\r?\n/,
    )
    .filter(
      Boolean,
    )
    .flatMap(
      line => {
        try {
          const parsed =
            JSON.parse(
              line,
            ) as Partial<TrackedValue>;

          if (
            (
              parsed.type ===
                "mobile" ||
              parsed.type ===
                "order"
            ) &&
            typeof parsed.value ===
              "string" &&
            parsed.value
          ) {
            return [
              parsed as
                TrackedValue,
            ];
          }
        } catch {
          // Ignore damaged tracking lines.
        }

        return [];
      },
    );
}

async function cleanupOrders(
  trackedOrderIds:
    string[],
): Promise<number> {
  const orders =
    await prisma.order.findMany({
      where: {
        OR: [
          {
            idempotencyKey: {
              startsWith:
                "e2e:",
            },
          },

          ...(trackedOrderIds.length
            ? [
                {
                  id: {
                    in:
                      trackedOrderIds,
                  },
                },
              ]
            : []),
        ],
      },

      include: {
        items:
          true,
      },
    });

  for (
    const order of
    orders
  ) {
    await prisma.$transaction(
      async tx => {
        const current =
          await tx.order.findUnique({
            where: {
              id:
                order.id,
            },

            include: {
              items:
                true,
            },
          });

        if (
          !current
        ) {
          return;
        }

        const mustRestoreInventory =
          !current.inventoryCommittedAt &&
          !current.inventoryReleasedAt;

        if (
          mustRestoreInventory
        ) {
          for (
            const item of
            current.items
          ) {
            if (
              item.variantId
            ) {
              await tx.productVariant.updateMany({
                where: {
                  id:
                    item.variantId,
                },

                data: {
                  stock: {
                    increment:
                      item.quantity,
                  },
                },
              });

              continue;
            }

            if (
              item.productId
            ) {
              await tx.product.updateMany({
                where: {
                  id:
                    item.productId,
                },

                data: {
                  stock: {
                    increment:
                      item.quantity,
                  },
                },
              });
            }
          }
        }

        await tx.order.delete({
          where: {
            id:
              current.id,
          },
        });
      },
    );
  }

  return orders.length;
}

async function cleanupCustomers(
  mobiles:
    string[],
): Promise<number> {
  if (
    mobiles.length ===
    0
  ) {
    return 0;
  }

  const uniqueMobiles =
    Array.from(
      new Set(
        mobiles,
      ),
    );

  const customers =
    await prisma.customer.findMany({
      where: {
        mobile: {
          in:
            uniqueMobiles,
        },
      },

      select: {
        id:
          true,

        mobile:
          true,
      },
    });

  await prisma.customerOtpChallenge.deleteMany({
    where: {
      mobile: {
        in:
          uniqueMobiles,
      },
    },
  });

  if (
    customers.length >
    0
  ) {
    await prisma.customer.deleteMany({
      where: {
        id: {
          in:
            customers.map(
              customer =>
                customer.id,
            ),
        },
      },
    });
  }

  return customers.length;
}

async function main() {
  const tracked =
    readTracked();

  const trackedOrderIds =
    tracked
      .filter(
        item =>
          item.type ===
          "order",
      )
      .map(
        item =>
          item.value,
      );

  const mobiles =
    tracked
      .filter(
        item =>
          item.type ===
          "mobile",
      )
      .map(
        item =>
          item.value,
      );

  const orders =
    await cleanupOrders(
      trackedOrderIds,
    );

  const customers =
    await cleanupCustomers(
      mobiles,
    );

  const adminSessions =
    await prisma.adminSession.deleteMany({
      where: {
        userAgent: {
          startsWith:
            "ELORIA-E2E-PLAYWRIGHT/",
        },
      },
    });

  if (
    existsSync(
      TRACK_FILE,
    )
  ) {
    unlinkSync(
      TRACK_FILE,
    );
  }

  console.log(
    `E2E cleanup complete: ${orders} order(s), ${customers} customer(s), ${adminSessions.count} admin session(s).`,
  );
}

main()
  .catch(
    error => {
      console.error(
        "E2E cleanup failed.",
        error,
      );

      process.exitCode =
        1;
    },
  )
  .finally(
    async () => {
      await prisma
        .$disconnect()
        .catch(
          () =>
            undefined,
        );

      await databasePool
        .end()
        .catch(
          () =>
            undefined,
        );
    },
  );
