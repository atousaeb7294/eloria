"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { saveShipmentDetails, transitionOrderByAdmin, type AdminOrderTransition } from "@/lib/order-operations";

function localeOf(value: string) { return value === "en" ? "en" : "fa"; }
function text(form: FormData, key: string, max: number, required = false) {
  const raw = form.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  if (required && !value) throw new Error("فیلدهای الزامی را کامل کنید.");
  if (value.length > max) throw new Error("طول فیلد بیش از حد مجاز است.");
  return value || null;
}
async function session() { if (!(await hasValidAdminSession())) throw new Error("نشست مدیریت منقضی شده است."); }
function refresh(locale: string, orderId: string) { revalidatePath(`/${locale}/admin/orders/${orderId}`); revalidatePath(`/${locale}/admin/orders`); revalidatePath(`/${locale}/order-tracking`); }

export async function transitionAdminOrderAction(orderId: string, localeValue: string, form: FormData): Promise<void> {
  await session();
  const locale = localeOf(localeValue);
  const target = text(form, "target", 40, true) as AdminOrderTransition;
  if (!["CANCELLED", "PROCESSING", "SHIPPED", "COMPLETED"].includes(target)) redirect(`/${locale}/admin/orders/${orderId}?workflowError=invalid-target`);
  try { await transitionOrderByAdmin({ orderId, target, note: text(form, "note", 1000) }); }
  catch (error) { redirect(`/${locale}/admin/orders/${orderId}?workflowError=${encodeURIComponent(error instanceof Error ? error.message : "خطا")}`); }
  refresh(locale, orderId);
  redirect(`/${locale}/admin/orders/${orderId}?workflowSaved=1`);
}

export async function saveAdminShipmentAction(orderId: string, localeValue: string, form: FormData): Promise<void> {
  await session();
  const locale = localeOf(localeValue);
  try {
    await saveShipmentDetails({
      orderId,
      carrier: text(form, "carrier", 120, true)!,
      trackingCode: text(form, "trackingCode", 160, true)!,
      note: text(form, "note", 1000),
    });
  } catch (error) { redirect(`/${locale}/admin/orders/${orderId}?shipmentError=${encodeURIComponent(error instanceof Error ? error.message : "خطا")}`); }
  refresh(locale, orderId);
  redirect(`/${locale}/admin/orders/${orderId}?shipmentSaved=1`);
}
