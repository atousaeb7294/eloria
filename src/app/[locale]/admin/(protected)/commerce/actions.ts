"use server";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  allowedPreorderTransition,
  preorderLabels,
} from "@/lib/buyer-commerce-policy";
async function moderateReviewWork(locale: string, form: FormData) {
  if (!(await hasValidAdminSession()))
    throw new Error("نشست مدیریت معتبر نیست.");
  const id = String(form.get("id") || ""),
    status = String(form.get("status") || ""),
    reason = String(form.get("reason") || "").trim();
  if (
    !["APPROVED", "REJECTED", "HIDDEN"].includes(status) ||
    reason.length > 500 ||
    (!reason && status !== "APPROVED")
  )
    throw new Error("وضعیت و دلیل بررسی را وارد کنید.");
  await prisma.$transaction(async (tx) => {
    const before = await tx.buyerReview.findUniqueOrThrow({ where: { id } });
    const result = await tx.buyerReview.updateMany({
      where: { id, updatedAt: before.updatedAt },
      data: { status, moderationReason: reason || null },
    });
    if (!result.count) throw new Error("نظر هم‌زمان تغییر کرده است.");
    await tx.commerceAudit.create({
      data: {
        entityId: id,
        kind: "REVIEW",
        action: status,
        details: { before: before.status, reason },
      },
    });
  });
  revalidatePath(`/${locale}/admin/commerce`);
  revalidatePath(`/${locale}/products`, "layout");

}
async function updatePreorderWork(locale: string, form: FormData) {
  if (!(await hasValidAdminSession()))
    throw new Error("نشست مدیریت معتبر نیست.");
  const id = String(form.get("id") || ""),
    status = String(form.get("status") || ""),
    deliveryNote = String(form.get("deliveryNote") || "").trim(),
    orderNumber = String(form.get("orderNumber") || "").trim();
  if (deliveryNote.length > 500)
    throw new Error("توضیحات بیش از حد طولانی است.");
  await prisma.$transaction(async (tx) => {
    const before = await tx.preorderRequest.findUniqueOrThrow({
      where: { id },
    });
    if (!allowedPreorderTransition(before.status, status))
      throw new Error("این تغییر وضعیت مجاز نیست.");
    let orderId = before.orderId;
    if (status === "READY") {
      const product = await tx.product.findFirst({
        where: {
          id: before.productId,
          status: "ACTIVE",
          collection: { isActive: true },
        },
      });
      const variant = before.variantId
        ? await tx.productVariant.findFirst({
            where: {
              id: before.variantId,
              productId: before.productId,
              isActive: true,
            },
          })
        : null;
      if (
        !product ||
        (before.variantId && !variant) ||
        (variant?.stock ?? product.stock) < before.quantity ||
        !deliveryNote
      )
        throw new Error(
          "برای آمادهٔ خرید شدن، موجودی کافی و توضیح زمان تحویل لازم است.",
        );
    }
    if (status === "ORDERED") {
      const order = await tx.order.findUnique({
        where: { orderNumber },
        include: { items: true },
      });
      if (
        !order ||
        !before.customerId ||
        order.customerId !== before.customerId ||
        !order.paidAt ||
        !["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(
          order.status,
        ) ||
        !order.items.some(
          (i) =>
            i.productId === before.productId &&
            i.variantId === before.variantId &&
            i.quantity >= before.quantity,
        )
      )
        throw new Error(
          "سفارش پرداخت‌شده باید متعلق به همین مشتری، محصول، مدل و تعداد باشد.",
        );
      orderId = order.id;
    }
    if (status === "SHIPPED" || status === "COMPLETED") {
      const order = orderId
        ? await tx.order.findUnique({ where: { id: orderId } })
        : null;
      if (
        !order ||
        !(
          status === "SHIPPED" ? ["SHIPPED", "COMPLETED"] : ["COMPLETED"]
        ).includes(order.status)
      )
        throw new Error("ابتدا وضعیت ارسال یا تحویل سفارش اصلی را ثبت کنید.");
    }
    const result = await tx.preorderRequest.updateMany({
      where: { id, updatedAt: before.updatedAt },
      data: {
        status,
        deliveryNote: deliveryNote || before.deliveryNote,
        orderId,
      },
    });
    if (!result.count) throw new Error("درخواست هم‌زمان تغییر کرده است.");
    await tx.commerceAudit.create({
      data: {
        entityId: id,
        kind: "PREORDER",
        action: status,
        details: { before: before.status, deliveryNote, orderId },
      },
    });
    if (before.customerId)
      await tx.customerNotification.create({
        data: {
          customerId: before.customerId,
          type: "PREORDER_STATUS",
          titleFa: "به‌روزرسانی پیش‌سفارش",
          titleEn: "Preorder update",
          bodyFa: `درخواست ${id}: ${preorderLabels[status]}. ${deliveryNote}`,
          bodyEn: `Request ${id}: ${status}. ${deliveryNote}`,
        },
      });
  });
  revalidatePath(`/${locale}/admin/commerce`);
  revalidatePath(`/${locale}/profile/preorders`);

}

async function runAction(locale:string,form:FormData,work:(locale:string,form:FormData)=>Promise<void>){
 const lang=locale==="en"?"en":"fa";
 let message="";
 try{await work(lang,form);}catch(error){message=error instanceof Error && /^[\u0600-\u06ff]/.test(error.message)?error.message:"ثبت تغییر انجام نشد؛ دوباره تلاش کنید و در صورت تکرار، گزارش سرور را بررسی کنید.";}
 redirect(`/${lang}/admin/commerce?${message?`error=${encodeURIComponent(message)}`:"done=1"}`);
}
export async function moderateReview(locale:string,form:FormData){await runAction(locale,form,moderateReviewWork);}
export async function updatePreorder(locale:string,form:FormData){await runAction(locale,form,updatePreorderWork);}
