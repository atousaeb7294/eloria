import { z } from "zod";
export const buyerReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  displayName: z.string().trim().min(2).max(60),
  body: z.string().trim().min(10).max(2000),
});
export const purchaseStates = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
] as const;
export const preorderLabels: Record<string, string> = {
  RECEIVED: "ثبت‌شده",
  REVIEWING: "در حال بررسی",
  APPROVED: "تأمین تأیید شد",
  READY: "آمادهٔ خرید",
  ORDERED: "سفارش متصل شد",
  SHIPPED: "ارسال شد",
  COMPLETED: "تحویل شد",
  CANCELLED: "لغو شد",
};
const steps: Record<string, string[]> = {
  RECEIVED: ["REVIEWING", "CANCELLED"],
  REVIEWING: ["APPROVED", "CANCELLED"],
  APPROVED: ["READY", "CANCELLED"],
  READY: ["ORDERED", "CANCELLED"],
  ORDERED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};
export function allowedPreorderTransition(from: string, to: string) {
  return steps[from]?.includes(to) ?? false;
}
export function reviewRisk(text: string) {
  return /(?:https?:|www\.|@|(?:[0-9۰-۹٠-٩][\s-]*){8,})/iu.test(text);
}
