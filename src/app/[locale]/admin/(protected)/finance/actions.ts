"use server";

import {
  randomUUID,
} from "node:crypto";

import {
  Prisma,
} from "@/generated/prisma/client";
import {
  hasValidAdminSession,
} from "@/lib/admin-auth";
import {
  isFinanceExpenseCategory,
} from "@/lib/finance-expense";
import {
  parseFinancePeriod,
} from "@/lib/finance-analytics";
import {
  prisma,
  withDatabaseRetry,
} from "@/lib/prisma";
import {
  revalidatePath,
} from "next/cache";
import {
  redirect,
} from "next/navigation";

const maximumToman =
  999_999_999_999_999_999n;

class FinanceActionError extends Error {
  constructor(
    message: string,
  ) {
    super(message);
    this.name =
      "FinanceActionError";
  }
}

function localeOf(
  value: string,
) {
  return value === "en"
    ? "en"
    : "fa";
}

function normalizeDigits(
  value: string,
): string {
  const persian =
    "۰۱۲۳۴۵۶۷۸۹";
  const arabic =
    "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(
      /[۰-۹]/g,
      digit =>
        String(
          persian.indexOf(
            digit,
          ),
        ),
    )
    .replace(
      /[٠-٩]/g,
      digit =>
        String(
          arabic.indexOf(
            digit,
          ),
        ),
    );
}

function text(
  form: FormData,
  key: string,
  maximumLength: number,
  required = false,
): string | null {
  const raw =
    form.get(key);

  const value =
    typeof raw === "string"
      ? raw.trim()
      : "";

  if (
    required &&
    !value
  ) {
    throw new FinanceActionError(
      "همهٔ فیلدهای ضروری سند هزینه را کامل کنید.",
    );
  }

  if (
    value.length >
    maximumLength
  ) {
    throw new FinanceActionError(
      "طول یکی از فیلدهای سند هزینه بیش از حد مجاز است.",
    );
  }

  return value || null;
}

function requiredText(
  form: FormData,
  key: string,
  maximumLength: number,
  minimumLength: number,
): string {
  const value =
    text(
      form,
      key,
      maximumLength,
      true,
    )!;

  if (
    value.length <
    minimumLength
  ) {
    throw new FinanceActionError(
      "اطلاعات سند هزینه برای حسابرسی کافی نیست.",
    );
  }

  return value;
}

function toman(
  form: FormData,
  key: string,
  required = false,
): string {
  const raw =
    text(
      form,
      key,
      30,
      required,
    );

  if (!raw) {
    return "0";
  }

  const normalized =
    normalizeDigits(raw)
      .replace(
        /[,،\s]/g,
        "",
      );

  if (
    !/^\d+$/.test(
      normalized,
    )
  ) {
    throw new FinanceActionError(
      "مبلغ باید یک عدد صحیح به تومان باشد.",
    );
  }

  const value =
    BigInt(normalized);

  if (
    (required &&
      value <= 0n) ||
    value >
      maximumToman
  ) {
    throw new FinanceActionError(
      "مبلغ واردشده معتبر نیست.",
    );
  }

  return value.toString();
}

function occurredAt(
  form: FormData,
): Date {
  const value =
    requiredText(
      form,
      "occurredAt",
      10,
      10,
    );

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    throw new FinanceActionError(
      "تاریخ سند معتبر نیست.",
    );
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const calendarCheck =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  if (
    calendarCheck.getUTCFullYear() !==
      year ||
    calendarCheck.getUTCMonth() + 1 !==
      month ||
    calendarCheck.getUTCDate() !==
      day
  ) {
    throw new FinanceActionError(
      "تاریخ سند معتبر نیست.",
    );
  }

  const result =
    new Date(
      `${value}T12:00:00.000+03:30`,
    );

  if (
    Number.isNaN(
      result.getTime(),
    )
  ) {
    throw new FinanceActionError(
      "تاریخ سند معتبر نیست.",
    );
  }

  const tomorrow =
    new Date();

  tomorrow.setDate(
    tomorrow.getDate() + 1,
  );

  if (
    result > tomorrow
  ) {
    throw new FinanceActionError(
      "ثبت هزینه برای تاریخ آینده مجاز نیست.",
    );
  }

  return result;
}

function documentNumber(): string {
  const day =
    new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");

  const suffix =
    randomUUID()
      .replaceAll("-", "")
      .slice(0, 8);

  return `exp-${day}-${suffix}`;
}

function financePath(
  locale: string,
  periodValue: string | null,
  extra: Record<
    string,
    string
  > = {},
): string {
  const period =
    parseFinancePeriod(
      periodValue ??
        undefined,
    );

  const query =
    new URLSearchParams({
      period: String(period),
      ...extra,
    });

  return `/${locale}/admin/finance?${query.toString()}`;
}

function publicError(
  error: unknown,
): string {
  if (
    error instanceof
    FinanceActionError
  ) {
    return error.message;
  }

  console.error(
    "[Eloria Finance Action] Unexpected error.",
    error,
  );

  return "ثبت سند انجام نشد. دوباره تلاش کنید.";
}

async function requireSession() {
  if (
    !(
      await hasValidAdminSession()
    )
  ) {
    throw new FinanceActionError(
      "نشست مدیریت منقضی شده است.",
    );
  }
}

function json(
  value: unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}

function isUuid(
  value: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function refresh(
  locale: string,
) {
  revalidatePath(
    `/${locale}/admin/finance`,
  );
}

export async function saveFinanceExpenseAction(
  localeValue: string,
  form: FormData,
): Promise<void> {
  const locale =
    localeOf(localeValue);

  const period =
    text(
      form,
      "period",
      3,
    );

  try {
    await requireSession();

    const categoryValue =
      requiredText(
        form,
        "category",
        40,
        3,
      );

    if (
      !isFinanceExpenseCategory(
        categoryValue,
      )
    ) {
      throw new FinanceActionError(
        "دسته‌بندی هزینه معتبر نیست.",
      );
    }

    const amountToman =
      toman(
        form,
        "amountToman",
        true,
      );

    const taxToman =
      toman(
        form,
        "taxToman",
      );

    const supplier =
      requiredText(
        form,
        "supplier",
        160,
        2,
      );

    const reference =
      requiredText(
        form,
        "reference",
        160,
        3,
      );

    const note =
      text(
        form,
        "note",
        2_000,
      );

    const expenseDate =
      occurredAt(form);

    await withDatabaseRetry(
      () =>
        prisma.$transaction(
          async transaction => {
            const duplicate =
              await transaction.financeExpense.findFirst({
                where: {
                  status: "POSTED",
                  supplier: {
                    equals: supplier,
                    mode: "insensitive",
                  },
                  reference: {
                    equals: reference,
                    mode: "insensitive",
                  },
                },
                select: {
                  documentNumber: true,
                },
              });

            if (duplicate) {
              throw new FinanceActionError(
                `این رسید قبلاً با شماره ${duplicate.documentNumber} ثبت شده است.`,
              );
            }

            const expense =
              await transaction.financeExpense.create({
                data: {
                  documentNumber:
                    documentNumber(),
                  category: categoryValue,
                  amountToman,
                  taxToman,
                  occurredAt: expenseDate,
                  supplier,
                  reference,
                  note,
                },
              });

            await transaction.financeExpenseAuditEvent.create({
              data: {
                expenseId: expense.id,
                eventType: "EXPENSE_POSTED",
                payload: json({
                  documentNumber:
                    expense.documentNumber,
                  category: expense.category,
                  amountToman:
                    expense.amountToman.toString(),
                  taxToman:
                    expense.taxToman.toString(),
                  occurredAt:
                    expense.occurredAt.toISOString(),
                  supplier,
                  reference,
                }),
              },
            });
          },
          {
            maxWait: 5_000,
            timeout: 20_000,
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable,
          },
        ),
      {
        attempts: 2,
        delayMilliseconds: 250,
      },
    );
  } catch (error) {
    redirect(
      financePath(
        locale,
        period,
        {
          expenseError:
            publicError(error),
        },
      ),
    );
  }

  refresh(locale);

  redirect(
    financePath(
      locale,
      period,
      {
        expenseSaved: "1",
      },
    ),
  );
}

export async function voidFinanceExpenseAction(
  expenseId: string,
  localeValue: string,
  form: FormData,
): Promise<void> {
  const locale =
    localeOf(localeValue);

  const period =
    text(
      form,
      "period",
      3,
    );

  try {
    await requireSession();

    if (
      !isUuid(expenseId)
    ) {
      throw new FinanceActionError(
        "شناسهٔ سند هزینه معتبر نیست.",
      );
    }

    const reason =
      requiredText(
        form,
        "voidReason",
        1_000,
        5,
      );

    await withDatabaseRetry(
      () =>
        prisma.$transaction(
          async transaction => {
            const expense =
              await transaction.financeExpense.findUnique({
                where: {
                  id: expenseId,
                },
                select: {
                  id: true,
                  status: true,
                  documentNumber: true,
                },
              });

            if (!expense) {
              throw new FinanceActionError(
                "سند هزینه پیدا نشد.",
              );
            }

            if (
              expense.status ===
              "VOID"
            ) {
              throw new FinanceActionError(
                "این سند قبلاً باطل شده است.",
              );
            }

            const voidedAt =
              new Date();

            await transaction.financeExpense.update({
              where: {
                id: expense.id,
              },
              data: {
                status: "VOID",
                voidedAt,
                voidReason: reason,
              },
            });

            await transaction.financeExpenseAuditEvent.create({
              data: {
                expenseId: expense.id,
                eventType: "EXPENSE_VOIDED",
                payload: json({
                  documentNumber:
                    expense.documentNumber,
                  reason,
                  voidedAt:
                    voidedAt.toISOString(),
                }),
              },
            });
          },
          {
            maxWait: 5_000,
            timeout: 20_000,
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable,
          },
        ),
      {
        attempts: 2,
        delayMilliseconds: 250,
      },
    );
  } catch (error) {
    redirect(
      financePath(
        locale,
        period,
        {
          expenseError:
            publicError(error),
        },
      ),
    );
  }

  refresh(locale);

  redirect(
    financePath(
      locale,
      period,
      {
        expenseVoided: "1",
      },
    ),
  );
}
