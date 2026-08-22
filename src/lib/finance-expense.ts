import type {
  FinanceExpenseCategory,
} from "@/generated/prisma/client";

export const financeExpenseCategories: FinanceExpenseCategory[] = [
  "INVENTORY_PURCHASE",
  "SHIPPING_COST",
  "MARKETING",
  "RENT",
  "PAYROLL",
  "GATEWAY_FEE",
  "PACKAGING",
  "TAX",
  "SOFTWARE",
  "OTHER",
];

const labels: Record<
  FinanceExpenseCategory,
  string
> = {
  INVENTORY_PURCHASE: "خرید کالا یا طلا",
  SHIPPING_COST: "ارسال و حمل",
  MARKETING: "تبلیغات و بازاریابی",
  RENT: "اجاره و هزینهٔ محل",
  PAYROLL: "حقوق و دستمزد",
  GATEWAY_FEE: "کارمزد درگاه",
  PACKAGING: "بسته‌بندی",
  TAX: "مالیات و عوارض",
  SOFTWARE: "نرم‌افزار و سرویس‌ها",
  OTHER: "سایر هزینه‌ها",
};

export function getFinanceExpenseCategoryLabel(
  category: FinanceExpenseCategory,
): string {
  return labels[category];
}

export function isFinanceExpenseCategory(
  value: string,
): value is FinanceExpenseCategory {
  return financeExpenseCategories.includes(
    value as FinanceExpenseCategory,
  );
}

export function isOperatingExpense(
  category: FinanceExpenseCategory,
): boolean {
  return category !==
    "INVENTORY_PURCHASE";
}
