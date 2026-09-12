import { z } from "zod";
import { normalizeCheckoutMobile } from "@/lib/checkout-customer";
export const preorderSchema = z.object({
  requestId: z.string().uuid(), locale: z.enum(["fa", "en"]).default("fa"),
  variantId: z.string().uuid().nullable().optional(), name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(30), quantity: z.number().int().min(1).max(20),
  notes: z.string().trim().max(500).default(""), turnstileToken: z.string().max(4096).nullable().optional(),
});
export function isPreorderAvailable(product: { status: string; stock: number; collection: { isActive: boolean } }, variant?: { stock: number; isActive: boolean } | null) {
  if (!product.collection.isActive || !["ACTIVE", "OUT_OF_STOCK"].includes(product.status)) return false;
  if (variant && !variant.isActive) return false;
  return product.status === "OUT_OF_STOCK" || (variant?.stock ?? product.stock) <= 0;
}
export function normalizePreorder(input: unknown) {
  const result = preorderSchema.parse(input);
  return { ...result, phone: normalizeCheckoutMobile(result.phone) };
}
export function preorderMessage(input: ReturnType<typeof normalizePreorder>, product: { id: string; slug: string; nameFa: string }, variant?: { id: string; titleFa: string } | null) {
  return ["[PREORDER] درخواست پیش‌سفارش", `شناسه درخواست: ${input.requestId}`, `محصول: ${product.nameFa}`, `شناسه محصول: ${product.id}`, `مسیر: /${input.locale}/products/${product.slug}`, variant ? `مدل: ${variant.titleFa} (${variant.id})` : "مدل: محصول اصلی", `تعداد: ${input.quantity}`, `نام: ${input.name}`, `تلفن: ${input.phone}`, input.notes ? `توضیحات: ${input.notes}` : "", "بدون پرداخت و رزرو موجودی؛ نیازمند تأیید امکان تأمین، زمان تحویل و قیمت نهایی توسط مدیریت."].filter(Boolean).join("\n");
}
