import {
  Prisma,
} from "@/generated/prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import { restoreReservedInventory } from "@/lib/inventory";

const DEFAULT_BATCH_SIZE =
  25;

const MAX_BATCH_SIZE =
  100;

const TRANSACTION_RETRY_COUNT =
  3;

type ExpiredOrderCandidate = {
  id: string;
  orderNumber: string;
};

type RestorationIssue = {
  orderItemId: string;
  productId: string | null;
  variantId: string | null;
  quantity: number;
  reason:
    | "PRODUCT_NOT_FOUND"
    | "VARIANT_NOT_FOUND"
    | "INVENTORY_REFERENCE_MISSING";
};

export type ReleasedExpiredOrder = {
  orderId: string;
  orderNumber: string;
  released: boolean;
  restoredUnits: number;
  restorationIssues: RestorationIssue[];
};

export type ExpiredOrderReleaseError = {
  orderId: string;
  orderNumber: string;
  message: string;
};

export type ReleaseExpiredOrdersResult = {
  checkedAt: string;
  candidateCount: number;
  releasedCount: number;
  skippedCount: number;
  restoredUnits: number;
  orders: ReleasedExpiredOrder[];
  errors: ExpiredOrderReleaseError[];
};

function normalizeBatchSize(
  value?: number,
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.min(
    Math.max(
      Math.trunc(value),
      1,
    ),
    MAX_BATCH_SIZE,
  );
}

function toJsonValue(
  value: unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}

function getPrismaErrorCode(
  error: unknown,
): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string"
  ) {
    return null;
  }

  return error.code;
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "خطای ناشناخته هنگام آزادسازی موجودی سفارش.";
}

async function releaseSingleExpiredOrder(
  candidate: ExpiredOrderCandidate,
  checkedAt: Date,
): Promise<ReleasedExpiredOrder> {
  for (
    let attempt = 1;
    attempt <=
    TRANSACTION_RETRY_COUNT;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          /*
           * سفارش ابتدا داخل همان تراکنش Claim می‌شود.
           * اگر Cron دیگری قبلاً سفارش را آزاد کرده باشد،
           * count برابر صفر خواهد بود و موجودی دوباره افزایش پیدا نمی‌کند.
           */
          const claimedOrder =
            await transaction.order.updateMany({
              where: {
                id: candidate.id,

                status: {
                  in: [
                    "PENDING_PAYMENT",
                    "PAYMENT_FAILED",
                  ],
                },

                inventoryExpiresAt: {
                  lte: checkedAt,
                },

                inventoryReleasedAt:
                  null,

                inventoryCommittedAt:
                  null,

                paidAt:
                  null,

                payments: {
                  none: {
                    status: "PENDING_VERIFICATION",
                    verificationLeaseExpiresAt: { gt: checkedAt },
                  },
                },
              },

              data: {
                status:
                  "EXPIRED",

                inventoryReleasedAt:
                  checkedAt,

                expiredAt:
                  checkedAt,
              },
            });

          if (
            claimedOrder.count !== 1
          ) {
            return {
              orderId:
                candidate.id,

              orderNumber:
                candidate.orderNumber,

              released:
                false,

              restoredUnits:
                0,

              restorationIssues:
                [],
            };
          }

          const orderItems =
            await transaction.orderItem.findMany({
              where: {
                orderId:
                  candidate.id,
              },

              orderBy: {
                createdAt:
                  "asc",
              },

              select: {
                id:
                  true,

                productId:
                  true,

                variantId:
                  true,

                productSlug:
                  true,

                quantity:
                  true,

                stockBeforeReservation:
                  true,

                stockAfterReservation:
                  true,
              },
            });

          const inventoryResult =
            await restoreReservedInventory(
              transaction,
              candidate.id,
            );

          const restoredUnits =
            inventoryResult.restoredUnits;

          const restorationIssues =
            inventoryResult.issues;

          const eventType =
            restorationIssues.length >
            0
              ? "ORDER_EXPIRED_INVENTORY_RELEASED_WITH_ISSUES"
              : "ORDER_EXPIRED_INVENTORY_RELEASED";

          await transaction.orderAuditEvent.create({
            data: {
              orderId:
                candidate.id,

              actorType:
                "SYSTEM",

              eventType,

              payload:
                toJsonValue({
                  checkedAt:
                    checkedAt.toISOString(),

                  restoredUnits,

                  orderItemCount:
                    orderItems.length,

                  restorationIssues,

                  items:
                    orderItems.map(
                      (item) => ({
                        orderItemId:
                          item.id,

                        productId:
                          item.productId,

                        variantId:
                          item.variantId,

                        productSlug:
                          item.productSlug,

                        quantity:
                          item.quantity,

                        stockBeforeReservation:
                          item.stockBeforeReservation,

                        stockAfterReservation:
                          item.stockAfterReservation,
                      }),
                    ),
                }),
            },
          });

          return {
            orderId:
              candidate.id,

            orderNumber:
              candidate.orderNumber,

            released:
              true,

            restoredUnits,

            restorationIssues,
          };
        },
        {
          isolationLevel:
            "Serializable",

          maxWait:
            15_000,

          timeout:
            45_000,
        },
      );
    } catch (error) {
      const prismaErrorCode =
        getPrismaErrorCode(
          error,
        );

      /*
       * در صورت تداخل دو تراکنش هم‌زمان،
       * عملیات با تراکنش جدید تکرار می‌شود.
       */
      if (
        prismaErrorCode ===
          "P2034" &&
        attempt <
          TRANSACTION_RETRY_COUNT
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "آزادسازی موجودی سفارش پس از چند تلاش ناموفق بود.",
  );
}

export async function releaseExpiredCheckoutOrders(
  options: {
    batchSize?: number;
    now?: Date;
    orderIds?: string[];
  } = {},
): Promise<ReleaseExpiredOrdersResult> {
  const batchSize =
    normalizeBatchSize(
      options.batchSize,
    );

  const checkedAt =
    options.now ??
    new Date();

  const candidates =
    await prisma.order.findMany({
      where: {
        ...(options.orderIds?.length ? { id: { in: options.orderIds } } : {}),

        status: {
          in: [
            "PENDING_PAYMENT",
            "PAYMENT_FAILED",
          ],
        },

        inventoryExpiresAt: {
          lte: checkedAt,
        },

        inventoryReleasedAt:
          null,

        inventoryCommittedAt:
          null,

        paidAt:
          null,

        payments: {
          none: {
            status: "PENDING_VERIFICATION",
            verificationLeaseExpiresAt: { gt: checkedAt },
          },
        },
      },

      orderBy: {
        inventoryExpiresAt:
          "asc",
      },

      take:
        batchSize,

      select: {
        id:
          true,

        orderNumber:
          true,
      },
    });

  const orders:
    ReleasedExpiredOrder[] =
      [];

  const errors:
    ExpiredOrderReleaseError[] =
      [];

  /*
   * به‌دلیل محدودبودن Connection Pool پروژه،
   * سفارش‌ها به‌صورت ترتیبی پردازش می‌شوند.
   */
  for (
    const candidate of candidates
  ) {
    try {
      const result =
        await releaseSingleExpiredOrder(
          candidate,
          checkedAt,
        );

      orders.push(result);
    } catch (error) {
      console.error(
        "[Eloria Orders] Unable to release expired inventory.",
        {
          orderId:
            candidate.id,

          orderNumber:
            candidate.orderNumber,

          error,
        },
      );

      errors.push({
        orderId:
          candidate.id,

        orderNumber:
          candidate.orderNumber,

        message:
          getErrorMessage(
            error,
          ),
      });
    }
  }

  const releasedOrders =
    orders.filter(
      (order) =>
        order.released,
    );

  return {
    checkedAt:
      checkedAt.toISOString(),

    candidateCount:
      candidates.length,

    releasedCount:
      releasedOrders.length,

    skippedCount:
      orders.length -
      releasedOrders.length,

    restoredUnits:
      releasedOrders.reduce(
        (
          total,
          order,
        ) =>
          total +
          order.restoredUnits,

        0,
      ),

    orders,

    errors,
  };
}