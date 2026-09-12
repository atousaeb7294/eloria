import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { factualImageAlt, normalizePersianSeo, normalizePersianArticle, plainSeoText } from "@/lib/seo-content-tools";

export const seoAutomationEnabled = () => process.env.ELORIA_SEO_AUTOPILOT_ENABLED !== "false";
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export type SeoCursor = { article?: string; image?: string };
export async function repairSeoBatch(cursor: SeoCursor = {}, target?: { articleSlug?: string; productSlug?: string }) {
  if (!seoAutomationEnabled()) return { changed: 0, cursor, disabled: true };
  const [articles, images] = await Promise.all([
    target?.productSlug ? [] : prisma.contentArticle.findMany({
      where: { status: { not: "ARCHIVED" }, ...(target?.articleSlug ? { slug: target.articleSlug } : cursor.article ? { id: { gt: cursor.article } } : {}) },
      orderBy: { id: "asc" }, take: 40,
      include: { sourceProduct: { select: { images: { orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }], take: 1, select: { imageUrl: true } } } }, auditEvents: { where: { eventType: "SEO_AUTOPILOT_RESTORED" }, take: 1 } },
    }),
    target?.articleSlug ? [] : prisma.productImage.findMany({
      where: { ...(target?.productSlug ? { product: { slug: target.productSlug } } : cursor.image ? { id: { gt: cursor.image } } : {}) },
      orderBy: { id: "asc" }, take: 100,
      include: { product: { select: { nameFa: true, nameEn: true, slug: true, timelineEvents: { where: { eventType: "SEO_AUTOPILOT_RESTORED" }, take: 1 } } } },
    }),
  ]);
  let changed = 0;
  for (const a of articles) {
    if (a.auditEvents.length) continue;
    const data: Record<string, string> = {};
    const proposed = {
      seoTitleFa: plainSeoText(normalizePersianSeo(a.titleFa), 65), seoTitleEn: plainSeoText(a.titleEn, 65),
      seoDescriptionFa: plainSeoText(normalizePersianSeo(a.excerptFa || a.contentFa)), seoDescriptionEn: plainSeoText(a.excerptEn || a.contentEn),
      coverImageUrl: a.sourceProduct?.images[0]?.imageUrl || "",
    };
    for (const key of Object.keys(proposed) as (keyof typeof proposed)[]) {
      const value = a[key];
      if (!value?.trim() && proposed[key]) data[key] = proposed[key];
      else if ((key === "seoTitleFa" || key === "seoDescriptionFa") && value && normalizePersianSeo(value) !== value) data[key] = normalizePersianSeo(value);
    }
    const normalizedContent = normalizePersianArticle(a.contentFa);
    if (normalizedContent !== a.contentFa) data.contentFa = normalizedContent;
    if (!Object.keys(data).length) continue;
    const count = await prisma.$transaction(async tx => {
      const result = await tx.contentArticle.updateMany({ where: { id: a.id, updatedAt: a.updatedAt }, data });
      if (result.count) await tx.contentArticleAuditEvent.create({ data: { articleId: a.id, eventType: "SEO_AUTOPILOT_REPAIRED", payload: json({ before: Object.fromEntries(Object.keys(data).map(k => [k, a[k as keyof typeof a]])), after: data }) } });
      return result.count;
    });
    changed += count;
    if (count) for (const lang of ["fa", "en"]) revalidatePath(`/${lang}/journal/${a.slug}`);
  }
  for (const i of images) {
    if (i.product.timelineEvents.length) continue;
    const data = {
      ...(!i.altFa?.trim() && i.product.nameFa.trim() ? { altFa: factualImageAlt(i.product.nameFa, "fa") } : {}),
      ...(!i.altEn?.trim() && i.product.nameEn.trim() ? { altEn: factualImageAlt(i.product.nameEn, "en") } : {}),
    };
    if (!Object.keys(data).length) continue;
    const count = await prisma.$transaction(async tx => {
      const result = await tx.productImage.updateMany({ where: { id: i.id, updatedAt: i.updatedAt }, data });
      if (result.count) await tx.productTimelineEvent.create({ data: { productId: i.productId, eventType: "SEO_AUTOPILOT_REPAIRED", titleFa: "تکمیل متن جایگزین تصویر از نام واقعی محصول", details: json({ imageId: i.id, before: { altFa: i.altFa, altEn: i.altEn }, after: data }) } });
      return result.count;
    });
    changed += count;
    if (count) for (const lang of ["fa", "en"]) revalidatePath(`/${lang}/products/${i.product.slug}`);
  }
  if (changed) { revalidatePath("/sitemap.xml"); for (const lang of ["fa", "en"]) revalidatePath(`/${lang}/journal`); }
  return { changed, cursor: { article: articles.length === 40 ? articles.at(-1)?.id : undefined, image: images.length === 100 ? images.at(-1)?.id : undefined }, disabled: false };
}
