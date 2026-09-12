"use server";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export async function restoreSeoChange(locale: string, form: FormData) {
  if (!(await hasValidAdminSession())) throw new Error("نشست مدیریت معتبر نیست.");
  const id = String(form.get("id") || ""); const kind = String(form.get("kind") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("شناسه معتبر نیست.");
  const lang = locale === "en" ? "en" : "fa";
  await prisma.$transaction(async tx => {
    if (kind === "article") {
      const event = await tx.contentArticleAuditEvent.findUniqueOrThrow({ where: { id } });
      if (event.eventType !== "SEO_AUTOPILOT_REPAIRED") throw new Error("این رویداد قابل بازگشت نیست.");
      const payload = event.payload as { before: Record<string, string | null>; after: Record<string, string> };
      const current = await tx.contentArticle.findUniqueOrThrow({ where: { id: event.articleId } });
      const allowed = ["seoTitleFa", "seoTitleEn", "seoDescriptionFa", "seoDescriptionEn", "coverImageUrl", "contentFa"];
      const keys = Object.keys(payload.after);
      if (!keys.length || keys.some(k => !allowed.includes(k) || current[k as keyof typeof current] !== payload.after[k])) throw new Error("این اطلاعات پس از اصلاح تغییر کرده‌اند؛ بازگشت انجام نشد.");
      const data = Object.fromEntries(keys.map(k => [k, payload.before[k]]));
      const result = await tx.contentArticle.updateMany({ where: { id: current.id, updatedAt: current.updatedAt }, data });
      if (!result.count) throw new Error("ویرایش هم‌زمان؛ دوباره بررسی کنید.");
      await tx.contentArticleAuditEvent.create({ data: { articleId: current.id, eventType: "SEO_AUTOPILOT_RESTORED", payload: json({ eventId: id }) } });
      for (const l of ["fa", "en"]) revalidatePath(`/${l}/journal/${current.slug}`);
    } else if (kind === "image") {
      const event = await tx.productTimelineEvent.findUniqueOrThrow({ where: { id } });
      if (event.eventType !== "SEO_AUTOPILOT_REPAIRED") throw new Error("این رویداد قابل بازگشت نیست.");
      const payload = event.details as { imageId: string; before: Record<string, string | null>; after: Record<string, string> };
      const current = await tx.productImage.findUniqueOrThrow({ where: { id: payload.imageId }, include: { product: { select: { slug: true } } } });
      const keys = Object.keys(payload.after);
      if (current.productId !== event.productId || !keys.length || keys.some(k => !["altFa", "altEn"].includes(k) || current[k as keyof typeof current] !== payload.after[k])) throw new Error("متن تصویر پس از اصلاح تغییر کرده است.");
      const data = Object.fromEntries(keys.map(k => [k, payload.before[k]]));
      const result = await tx.productImage.updateMany({ where: { id: current.id, updatedAt: current.updatedAt }, data });
      if (!result.count) throw new Error("ویرایش هم‌زمان؛ دوباره بررسی کنید.");
      await tx.productTimelineEvent.create({ data: { productId: current.productId, eventType: "SEO_AUTOPILOT_RESTORED", titleFa: "بازگشت اصلاح سئو و توقف خودکارسازی این محصول", details: json({ eventId: id }) } });
      for (const l of ["fa", "en"]) revalidatePath(`/${l}/products/${current.product.slug}`);
    } else throw new Error("نوع رویداد معتبر نیست.");
  });
  revalidatePath(`/${lang}/admin/content/seo`); revalidatePath("/sitemap.xml");
  redirect(`/${lang}/admin/content/seo?restored=1`);
}
