import type {
  FinanceExpenseCategory,
  OrderStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import {
  averageToman,
  buildDailySales,
  createFinanceDateRange,
  netCashAfterExpenses,
  operatingResult,
  reconcileOrderPayments,
  tomanValue,
  type FinancePeriod,
} from "@/lib/finance-analytics";
import {
  isOperatingExpense,
} from "@/lib/finance-expense";
import {
  prisma,
} from "@/lib/prisma";

const settledOrderStatuses: OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
];

const receivedPaymentStatuses: PaymentStatus[] = [
  "PAID",
  "REFUNDED",
];

function settledOrdersIn(
  range: ReturnType<
    typeof createFinanceDateRange
  >,
) {
  return {
    status: {
      in: settledOrderStatuses,
    },
    paidAt: {
      gte: range.start,
      lt: range.end,
    },
  };
}

export async function getAdminFinanceReport(
  period: FinancePeriod,
) {
  const range =
    createFinanceDateRange(
      period,
    );

  const currentSalesWhere =
    settledOrdersIn(range);

  const previousSalesWhere = {
    status: {
      in: settledOrderStatuses,
    },
    paidAt: {
      gte: range.previousStart,
      lt: range.previousEnd,
    },
  };

  const itemWhere = {
    order: {
      is: currentSalesWhere,
    },
  };

  const postedExpenseWhere = {
    status: "POSTED" as const,
    occurredAt: {
      gte: range.start,
      lt: range.end,
    },
  };

  const allExpenseWhere = {
    occurredAt: {
      gte: range.start,
      lt: range.end,
    },
  };

  const [
    currentSales,
    previousSales,
    receivedPayments,
    refunds,
    itemTotals,
    topProductGroups,
    dailyOrders,
    paymentReview,
    currentExpenseTotals,
    expenseCategoryGroups,
    ledger,
    expenseAuditEventCount,
    reconciledOrders,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: currentSalesWhere,
      _count: {
        _all: true,
      },
      _sum: {
        payableToman: true,
        subtotalToman: true,
        shippingToman: true,
        discountToman: true,
      },
    }),
    prisma.order.aggregate({
      where: previousSalesWhere,
      _sum: {
        payableToman: true,
      },
    }),
    prisma.paymentAttempt.aggregate({
      where: {
        status: {
          in: receivedPaymentStatuses,
        },
        verifiedAt: {
          gte: range.start,
          lt: range.end,
        },
      },
      _sum: {
        amountToman: true,
      },
    }),
    prisma.paymentAttempt.aggregate({
      where: {
        status: "REFUNDED",
        refundedAt: {
          gte: range.start,
          lt: range.end,
        },
      },
      _sum: {
        refundAmountToman: true,
      },
    }),
    prisma.orderItem.aggregate({
      where: itemWhere,
      _sum: {
        lineTotalToman: true,
        profitToman: true,
        makingChargeToman: true,
        artisticFeeToman: true,
        taxToman: true,
      },
    }),
    prisma.orderItem.groupBy({
      by: [
        "productSlug",
        "productNameFa",
      ],
      where: itemWhere,
      _sum: {
        quantity: true,
        lineTotalToman: true,
        profitToman: true,
      },
      orderBy: [
        {
          _sum: {
            lineTotalToman: "desc",
          },
        },
        {
          productNameFa: "asc",
        },
      ],
      take: 5,
    }),
    prisma.order.findMany({
      where: currentSalesWhere,
      select: {
        paidAt: true,
        payableToman: true,
      },
      orderBy: {
        paidAt: "asc",
      },
    }),
    prisma.paymentAttempt.aggregate({
      where: {
        status: "REQUIRES_REVIEW",
        createdAt: {
          gte: range.start,
          lt: range.end,
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        amountToman: true,
      },
    }),
    prisma.financeExpense.aggregate({
      where: postedExpenseWhere,
      _count: {
        _all: true,
      },
      _sum: {
        amountToman: true,
        taxToman: true,
      },
    }),
    prisma.financeExpense.groupBy({
      by: [
        "category",
      ],
      where: postedExpenseWhere,
      _sum: {
        amountToman: true,
        taxToman: true,
      },
      orderBy: {
        _sum: {
          amountToman: "desc",
        },
      },
    }),
    prisma.financeExpense.findMany({
      where: allExpenseWhere,
      select: {
        id: true,
        documentNumber: true,
        status: true,
        category: true,
        amountToman: true,
        taxToman: true,
        occurredAt: true,
        supplier: true,
        reference: true,
        note: true,
        voidedAt: true,
        voidReason: true,
        createdAt: true,
      },
      orderBy: [
        {
          occurredAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 80,
    }),
    prisma.financeExpenseAuditEvent.count({
      where: {
        expense: {
          is: allExpenseWhere,
        },
      },
    }),
    prisma.order.findMany({
      where: currentSalesWhere,
      select: {
        id: true,
        orderNumber: true,
        payableToman: true,
        payments: {
          where: {
            status: {
              in: receivedPaymentStatuses,
            },
          },
          select: {
            amountToman: true,
          },
        },
      },
      orderBy: {
        paidAt: "desc",
      },
    }),
  ]);

  const salesToman =
    tomanValue(
      currentSales._sum.payableToman,
    );

  const receivedToman =
    tomanValue(
      receivedPayments._sum.amountToman,
    );

  const refundedToman =
    tomanValue(
      refunds._sum.refundAmountToman,
    );

  const priceMarginToman =
    tomanValue(
      itemTotals._sum.profitToman,
    );

  const baseExpenseToman =
    tomanValue(
      currentExpenseTotals._sum.amountToman,
    );

  const expenseTaxToman =
    tomanValue(
      currentExpenseTotals._sum.taxToman,
    );

  const totalExpenseToman =
    baseExpenseToman +
    expenseTaxToman;

  const expenseCategories =
    expenseCategoryGroups.map(
      group => {
        const baseToman =
          tomanValue(
            group._sum.amountToman,
          );

        const taxToman =
          tomanValue(
            group._sum.taxToman,
          );

        return {
          category:
            group.category as FinanceExpenseCategory,
          baseToman,
          taxToman,
          totalToman:
            baseToman +
            taxToman,
        };
      },
    );

  const inventoryPurchaseToman =
    expenseCategories
      .filter(
        expense =>
          !isOperatingExpense(
            expense.category,
          ),
      )
      .reduce(
        (total, expense) =>
          total +
          expense.totalToman,
        0n,
      );

  const operatingExpenseToman =
    expenseCategories
      .filter(
        expense =>
          isOperatingExpense(
            expense.category,
          ),
      )
      .reduce(
        (total, expense) =>
          total +
          expense.totalToman,
        0n,
      );

  const reconciliation =
    reconcileOrderPayments(
      reconciledOrders.map(
        order => ({
          id: order.id,
          orderNumber:
            order.orderNumber,
          expectedToman:
            order.payableToman,
          paymentAmounts:
            order.payments.map(
              payment =>
                payment.amountToman,
            ),
        }),
      ),
    );

  const orderCount =
    currentSales._count._all;

  return {
    range,
    salesToman,
    previousSalesToman: tomanValue(
      previousSales._sum.payableToman,
    ),
    orderCount,
    averageOrderToman: averageToman(
      salesToman,
      orderCount,
    ),
    receivedToman,
    refundedToman,
    netCashFlowToman:
      receivedToman -
      refundedToman,
    netCashAfterExpensesToman:
      netCashAfterExpenses(
        receivedToman,
        refundedToman,
        totalExpenseToman,
      ),
    itemRevenueToman: tomanValue(
      itemTotals._sum.lineTotalToman,
    ),
    shippingToman: tomanValue(
      currentSales._sum.shippingToman,
    ),
    discountToman: tomanValue(
      currentSales._sum.discountToman,
    ),
    priceMarginToman,
    operatingResultToman:
      operatingResult(
        priceMarginToman,
        operatingExpenseToman,
      ),
    makingChargeToman: tomanValue(
      itemTotals._sum.makingChargeToman,
    ),
    artisticFeeToman: tomanValue(
      itemTotals._sum.artisticFeeToman,
    ),
    taxToman: tomanValue(
      itemTotals._sum.taxToman,
    ),
    expenses: {
      count:
        currentExpenseTotals._count._all,
      baseToman:
        baseExpenseToman,
      taxToman:
        expenseTaxToman,
      totalToman:
        totalExpenseToman,
      inventoryPurchaseToman,
      operatingToman:
        operatingExpenseToman,
      categories:
        expenseCategories,
      ledger,
      auditEventCount:
        expenseAuditEventCount,
    },
    topProducts: topProductGroups.map(
      product => ({
        slug: product.productSlug,
        name: product.productNameFa,
        quantity:
          product._sum.quantity ??
          0,
        revenueToman: tomanValue(
          product._sum.lineTotalToman,
        ),
        priceMarginToman: tomanValue(
          product._sum.profitToman,
        ),
      }),
    ),
    dailySales: buildDailySales(
      range,
      dailyOrders,
    ),
    reconciliation: {
      inspectedOrderCount:
        reconciliation.inspectedOrderCount,
      mismatchCount:
        reconciliation.mismatchCount,
      mismatchToman:
        reconciliation.mismatchToman,
      examples:
        reconciliation.mismatches.slice(
          0,
          12,
        ),
      paymentReview: {
        count:
          paymentReview._count._all,
        amountToman: tomanValue(
          paymentReview._sum.amountToman,
        ),
      },
    },
  };
}
