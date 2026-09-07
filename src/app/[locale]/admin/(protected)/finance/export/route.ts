import {
  hasValidAdminSession,
} from "@/lib/admin-auth";
import {
  createFinanceDateRange,
  parseFinancePeriod,
} from "@/lib/finance-analytics";
import {
  getFinanceExpenseCategoryLabel,
} from "@/lib/finance-expense";
import {
  prisma,
} from "@/lib/prisma";

type ExportMode =
  | "ledger"
  | "audit";

function exportMode(
  value: string | null,
): ExportMode {
  return value === "audit"
    ? "audit"
    : "ledger";
}

function csvCell(
  value: unknown,
): string {
  const text =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  // Excel treats a leading formula character as executable input. Prefix it
  // before quoting so a supplier or reference cannot inject a spreadsheet formula.
  const safe =
    /^[=+\-@]/.test(text)
      ? `'${text}`
      : text;

  return `"${safe.replaceAll("\"", "\"\"")}"`;
}

function csv(
  rows: unknown[][],
): string {
  return rows
    .map(
      row =>
        row.map(csvCell).join(","),
    )
    .join("\r\n");
}

function dateValue(
  value: Date | null,
): string {
  return value
    ? value.toISOString()
    : "";
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      locale: string;
    }>;
  },
) {
  const {
    locale,
  } = await context.params;

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    return new Response(
      "Not found",
      {
        status: 404,
      },
    );
  }

  if (
    !(
      await hasValidAdminSession()
    )
  ) {
    return new Response(
      "Unauthorized",
      {
        status: 401,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  const url =
    new URL(request.url);

  const period =
    parseFinancePeriod(
      url.searchParams.get("period") ??
        undefined,
    );

  const mode =
    exportMode(
      url.searchParams.get("mode"),
    );

  const range =
    createFinanceDateRange(period);

  const expenseWhere = {
    occurredAt: {
      gte: range.start,
      lt: range.end,
    },
  };

  let rows: unknown[][];

  if (mode === "audit") {
    const events =
      await prisma.financeExpenseAuditEvent.findMany({
        where: {
          expense: {
            is: expenseWhere,
          },
        },
        select: {
          eventType: true,
          payload: true,
          createdAt: true,
          expense: {
            select: {
              documentNumber: true,
              status: true,
              occurredAt: true,
              supplier: true,
              reference: true,
            },
          },
        },
        orderBy: [
          {
            createdAt: "asc",
          },
          {
            id: "asc",
          },
        ],
      });

    rows = [
      [
        "شماره سند",
        "وضعیت فعلی سند",
        "تاریخ سند",
        "طرف حساب",
        "مرجع",
        "نوع رویداد",
        "زمان ثبت رویداد",
        "محتوای رویداد",
      ],
      ...events.map(
        event => [
          event.expense.documentNumber,
          event.expense.status,
          dateValue(
            event.expense.occurredAt,
          ),
          event.expense.supplier,
          event.expense.reference,
          event.eventType,
          dateValue(
            event.createdAt,
          ),
          JSON.stringify(
            event.payload,
          ),
        ],
      ),
    ];
  } else {
    const expenses =
      await prisma.financeExpense.findMany({
        where: expenseWhere,
        select: {
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
      });

    rows = [
      [
        "شماره سند",
        "وضعیت",
        "تاریخ سند",
        "دسته‌بندی",
        "طرف حساب",
        "شماره فاکتور یا رسید",
        "مبلغ اصلی (تومان)",
        "مالیات و عوارض (تومان)",
        "جمع هزینه (تومان)",
        "توضیح",
        "زمان ابطال",
        "دلیل ابطال",
        "زمان ثبت",
      ],
      ...expenses.map(
        expense => {
          const amount =
            BigInt(
              expense.amountToman
                .toString()
                .split(".")[0] ||
                "0",
            );

          const tax =
            BigInt(
              expense.taxToman
                .toString()
                .split(".")[0] ||
                "0",
            );

          return [
            expense.documentNumber,
            expense.status,
            dateValue(
              expense.occurredAt,
            ),
            getFinanceExpenseCategoryLabel(
              expense.category,
            ),
            expense.supplier,
            expense.reference,
            amount.toString(),
            tax.toString(),
            (amount + tax).toString(),
            expense.note,
            dateValue(expense.voidedAt),
            expense.voidReason,
            dateValue(expense.createdAt),
          ];
        },
      ),
    ];
  }

  const suffix =
    mode === "audit"
      ? "audit"
      : "ledger";

  const filename =
    `eloria-finance-${suffix}-${period}d-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(
    `\ufeff${csv(rows)}`,
    {
      headers: {
        "cache-control": "no-store, max-age=0",
        "content-disposition": `attachment; filename="${filename}"`,
        "content-type": "text/csv; charset=utf-8",
        "x-content-type-options": "nosniff",
      },
    },
  );
}
