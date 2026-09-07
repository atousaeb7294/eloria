import {
  Prisma,
} from "@/generated/prisma/client";

import {
  restoreReservedInventory,
} from "@/lib/inventory";
import {
  prisma,
  withDatabaseRetry,
} from "@/lib/prisma";

export type AdminOrderTransition =
  | "CANCELLED"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "REFUNDED";

const ALLOWED:
  Record<
    string,
    AdminOrderTransition[]
  > = {
  PENDING_PAYMENT: [
    "CANCELLED",
  ],
  PAYMENT_FAILED: [
    "CANCELLED",
  ],
  PAID: [
    "PROCESSING",
  ],
  PAYMENT_REVIEW: [
    "PROCESSING",
  ],
  PROCESSING: [
    "SHIPPED",
  ],
  SHIPPED: [
    "COMPLETED",
  ],
};

function json(
  value: unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}

export class OrderOperationError extends Error {
  constructor(
    message: string,
  ) {
    super(message);
    this.name =
      "OrderOperationError";
  }
}

export async function transitionOrderByAdmin({
  orderId,
  target,
  note,
}: {
  orderId: string;
  target:
    AdminOrderTransition;
  note: string | null;
}) {
  if (
    target === "REFUNDED"
  ) {
    throw new OrderOperationError(
      "بازپرداخت فقط از مسیر تلاش پرداخت و با شماره مرجع بانکی مجاز است.",
    );
  }

  return withDatabaseRetry(
    () =>
      prisma.$transaction(
        async transaction => {
          await transaction.$queryRaw`
            SELECT id
            FROM orders
            WHERE id = ${orderId}::uuid
            FOR UPDATE
          `;

          const order =
            await transaction.order.findUnique({
              where: {
                id: orderId,
              },
              select: {
                id: true,
                orderNumber:
                  true,
                status: true,
                inventoryReleasedAt:
                  true,
                inventoryCommittedAt:
                  true,
              },
            });

          if (!order) {
            throw new OrderOperationError(
              "سفارش پیدا نشد.",
            );
          }

          if (
            !(
              ALLOWED[
                order.status
              ] ?? []
            ).includes(
              target,
            )
          ) {
            throw new OrderOperationError(
              "این تغییر وضعیت برای سفارش فعلی مجاز نیست.",
            );
          }

          const now =
            new Date();

          let inventoryResult:
            unknown = null;

          if (
            target ===
            "CANCELLED"
          ) {
            if (
              order
                .inventoryCommittedAt
            ) {
              throw new OrderOperationError(
                "موجودی این سفارش قطعی شده و لغو مستقیم مجاز نیست.",
              );
            }

            if (
              !order
                .inventoryReleasedAt
            ) {
              inventoryResult =
                await restoreReservedInventory(
                  transaction,
                  orderId,
                );
            }

            await transaction.order.update({
              where: {
                id: orderId,
              },
              data: {
                status:
                  "CANCELLED",
                cancelledAt: now,
                inventoryReleasedAt:
                  order
                    .inventoryReleasedAt ??
                  now,
              },
            });
          } else if (
            target ===
            "PROCESSING"
          ) {
            if (
              order.status ===
              "PAYMENT_REVIEW"
            ) {
              if (
                order
                  .inventoryReleasedAt
              ) {
                throw new OrderOperationError(
                  "موجودی این پرداخت قبلاً آزاد شده است؛ ابتدا موجودی را دستی بررسی کنید و در صورت نبود کالا بازپرداخت انجام دهید.",
                );
              }

              await transaction.paymentAttempt.updateMany({
                where: {
                  orderId,
                  status:
                    "REQUIRES_REVIEW",
                },
                data: {
                  status:
                    "PAID",
                  activeKey:
                    null,
                  errorMessage:
                    null,
                },
              });
            }

            await transaction.order.update({
              where: {
                id: orderId,
              },
              data: {
                status:
                  "PROCESSING",
                inventoryCommittedAt:
                  order
                    .inventoryCommittedAt ??
                  now,
              },
            });
          } else if (
            target ===
            "SHIPPED"
          ) {
            await transaction.order.update({
              where: {
                id: orderId,
              },
              data: {
                status:
                  "SHIPPED",
              },
            });
          } else {
            await transaction.order.update({
              where: {
                id: orderId,
              },
              data: {
                status:
                  "COMPLETED",
              },
            });
          }

          await transaction.orderAuditEvent.create({
            data: {
              orderId,
              actorType:
                "ADMIN",
              eventType:
                "ADMIN_STATUS_CHANGED",
              payload: json({
                from:
                  order.status,
                to: target,
                note,
                inventoryResult,
              }),
            },
          });

          return {
            orderNumber:
              order.orderNumber,
            from:
              order.status,
            to: target,
          };
        },
        {
          maxWait: 5_000,
          timeout: 20_000,
          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        },
      ),
    {
      attempts: 2,
      delayMilliseconds: 250,
    },
  );
}

function normalizeRefundReference(
  value: string,
): string {
  const reference =
    value.trim();

  if (
    reference.length < 6 ||
    reference.length > 160
  ) {
    throw new OrderOperationError(
      "شماره مرجع بازپرداخت باید بین ۶ تا ۱۶۰ کاراکتر باشد.",
    );
  }

  if (
    !/^[A-Za-z0-9._:/-]+$/.test(
      reference,
    )
  ) {
    throw new OrderOperationError(
      "ساختار شماره مرجع بازپرداخت معتبر نیست.",
    );
  }

  return reference;
}

/*
 * Backward-compatible exported name, with a hardened contract:
 * both PAID and REQUIRES_REVIEW attempts may be manually confirmed as
 * refunded, but ONLY after an actual bank/provider refund has produced a
 * durable reference.
 */
export async function markReviewedPaymentRefunded({
  orderId,
  paymentAttemptId,
  refundReference,
  note,
}: {
  orderId: string;
  paymentAttemptId: string;
  refundReference: string;
  note: string | null;
}) {
  const normalizedReference =
    normalizeRefundReference(
      refundReference,
    );

  return withDatabaseRetry(
    () =>
      prisma.$transaction(
        async transaction => {
          await transaction.$queryRaw`
            SELECT id
            FROM orders
            WHERE id = ${orderId}::uuid
            FOR UPDATE
          `;

          await transaction.$queryRaw`
            SELECT id
            FROM payment_attempts
            WHERE id = ${paymentAttemptId}::uuid
            FOR UPDATE
          `;

          const order =
            await transaction.order.findUnique({
              where: {
                id: orderId,
              },
              select: {
                id: true,
                orderNumber:
                  true,
                status: true,
                inventoryReleasedAt:
                  true,
                inventoryCommittedAt:
                  true,
              },
            });

          const attempt =
            await transaction.paymentAttempt.findFirst({
              where: {
                id:
                  paymentAttemptId,
                orderId,
              },
              select: {
                id: true,
                status: true,
                gatewayReference:
                  true,
                amountToman:
                  true,
                refundReference:
                  true,
              },
            });

          if (
            !order ||
            !attempt
          ) {
            throw new OrderOperationError(
              "سفارش یا تلاش پرداخت پیدا نشد.",
            );
          }

          if (
            attempt.status ===
            "REFUNDED"
          ) {
            if (
              attempt
                .refundReference ===
              normalizedReference
            ) {
              return {
                paymentAttemptId:
                  attempt.id,
                orderRefunded:
                  order.status ===
                  "REFUNDED",
              };
            }

            throw new OrderOperationError(
              "این پرداخت قبلاً با مرجع دیگری بازپرداخت شده است.",
            );
          }

          if (
            ![
              "PAID",
              "REQUIRES_REVIEW",
            ].includes(
              attempt.status,
            )
          ) {
            throw new OrderOperationError(
              "فقط پرداخت تأییدشده یا نیازمند بررسی را می‌توان بازپرداخت‌شده ثبت کرد.",
            );
          }

          const refundedAt =
            new Date();

          await transaction.paymentAttempt.update({
            where: {
              id: attempt.id,
            },
            data: {
              status:
                "REFUNDED",
              activeKey: null,
              refundedAt,
              refundReference:
                normalizedReference,
              refundAmountToman:
                attempt.amountToman,
              refundNote:
                note,
              errorMessage:
                null,
            },
          });

          const remainingSuccessfulPayments =
            await transaction.paymentAttempt.count({
              where: {
                orderId,
                id: {
                  not:
                    attempt.id,
                },
                status: {
                  in: [
                    "PAID",
                    "REQUIRES_REVIEW",
                  ],
                },
              },
            });

          let inventoryResult:
            unknown = null;

          const orderRefunded =
            remainingSuccessfulPayments ===
            0;

          if (orderRefunded) {
            /*
             * A committed/fulfilled sale is NOT automatically restocked merely
             * because money was refunded. That operational decision belongs to
             * a physical return/inspection workflow. Only a still-reserved,
             * never-committed inventory block is released automatically.
             */
            if (
              !order
                .inventoryCommittedAt &&
              !order
                .inventoryReleasedAt
            ) {
              inventoryResult =
                await restoreReservedInventory(
                  transaction,
                  orderId,
                );
            }

            await transaction.order.update({
              where: {
                id: orderId,
              },
              data: {
                status:
                  "REFUNDED",
                refundedAt,
                ...(
                  inventoryResult
                    ? {
                        inventoryReleasedAt:
                          refundedAt,
                      }
                    : {}
                ),
              },
            });
          }

          await transaction.orderAuditEvent.create({
            data: {
              orderId,
              actorType:
                "ADMIN",
              eventType:
                "PAYMENT_ATTEMPT_MANUALLY_REFUNDED",
              payload: json({
                paymentAttemptId:
                  attempt.id,
                gatewayReference:
                  attempt
                    .gatewayReference,
                refundReference:
                  normalizedReference,
                amountToman:
                  attempt
                    .amountToman
                    .toString(),
                note,
                orderRefunded,
                inventoryResult,
                refundedAt:
                  refundedAt.toISOString(),
              }),
            },
          });

          return {
            paymentAttemptId:
              attempt.id,
            orderRefunded,
          };
        },
        {
          maxWait: 5_000,
          timeout: 20_000,
          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        },
      ),
    {
      attempts: 2,
      delayMilliseconds: 250,
    },
  );
}

export async function saveShipmentDetails({
  orderId,
  carrier,
  trackingCode,
  note,
}: {
  orderId: string;
  carrier: string;
  trackingCode: string;
  note: string | null;
}) {
  const normalizedCarrier =
    carrier.trim();
  const normalizedTrackingCode =
    trackingCode.trim();

  if (
    !normalizedCarrier ||
    !normalizedTrackingCode
  ) {
    throw new OrderOperationError(
      "شرکت حمل و کد رهگیری الزامی است.",
    );
  }

  return withDatabaseRetry(
    () =>
      prisma.$transaction(
        async transaction => {
          await transaction.$queryRaw`
            SELECT id
            FROM orders
            WHERE id = ${orderId}::uuid
            FOR UPDATE
          `;

          const order =
            await transaction.order.findUnique({
              where: {
                id: orderId,
              },
              select: {
                id: true,
                status: true,
              },
            });

          if (!order) {
            throw new OrderOperationError(
              "سفارش پیدا نشد.",
            );
          }

          if (
            ![
              "PROCESSING",
              "SHIPPED",
            ].includes(
              order.status,
            )
          ) {
            throw new OrderOperationError(
              "اطلاعات ارسال فقط برای سفارش در حال پردازش یا ارسال‌شده ثبت می‌شود.",
            );
          }

          const shippedAt =
            order.status ===
            "SHIPPED"
              ? new Date()
              : null;

          const existing =
            await transaction.shipment.findFirst({
              where: {
                orderId,
                carrier:
                  normalizedCarrier,
                trackingCode:
                  normalizedTrackingCode,
              },
              select: {
                id: true,
              },
            });

          const shipment =
            existing
              ? await transaction.shipment.update({
                  where: {
                    id:
                      existing.id,
                  },
                  data: {
                    status:
                      order.status,
                    note,
                    shippedAt:
                      shippedAt ??
                      undefined,
                  },
                })
              : await transaction.shipment.create({
                  data: {
                    orderId,
                    carrier:
                      normalizedCarrier,
                    trackingCode:
                      normalizedTrackingCode,
                    status:
                      order.status,
                    note,
                    shippedAt,
                  },
                });

          await transaction.orderAuditEvent.create({
            data: {
              orderId,
              actorType:
                "ADMIN",
              eventType:
                "SHIPMENT_DETAILS_UPDATED",
              payload: json({
                shipmentId:
                  shipment.id,
                carrier:
                  normalizedCarrier,
                trackingCode:
                  normalizedTrackingCode,
                note,
                status:
                  order.status,
              }),
            },
          });

          return shipment;
        },
        {
          maxWait: 5_000,
          timeout: 20_000,
          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        },
      ),
    {
      attempts: 2,
      delayMilliseconds: 250,
    },
  );
}

export function availableAdminTransitions(
  status: string,
): AdminOrderTransition[] {
  return (
    ALLOWED[status] ?? []
  );
}
