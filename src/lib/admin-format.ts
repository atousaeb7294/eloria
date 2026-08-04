export function formatAdminMoney(
  value:
    | { toString(): string }
    | string
    | number
    | null
    | undefined,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  const rawValue =
    value.toString().trim();

  const integerPart =
    rawValue.split(".")[0];

  if (
    !/^-?\d+$/.test(
      integerPart,
    )
  ) {
    return rawValue;
  }

  try {
    return `${new Intl.NumberFormat("fa-IR").format(BigInt(integerPart))} تومان`;
  } catch {
    return `${integerPart} تومان`;
  }
}

export function formatAdminDate(
  value:
    | Date
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fa-IR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export function getProductStatusLabel(
  status: string,
): string {
  const labels: Record<string, string> = {
    DRAFT: "پیش‌نویس",
    ACTIVE: "منتشرشده",
    OUT_OF_STOCK: "ناموجود",
    ARCHIVED: "بایگانی‌شده",
  };

  return labels[status] ?? status;
}

export function getOrderStatusLabel(
  status: string,
): string {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: "در انتظار پرداخت",
    PAID: "پرداخت‌شده",
    PROCESSING: "در حال آماده‌سازی",
    SHIPPED: "ارسال‌شده",
    COMPLETED: "تکمیل‌شده",
    PAYMENT_FAILED: "پرداخت ناموفق",
    PAYMENT_REVIEW: "پرداخت نیازمند بررسی",
    CANCELLED: "لغوشده",
    EXPIRED: "منقضی‌شده",
    REFUNDED: "بازپرداخت‌شده",
  };

  return labels[status] ?? status;
}
