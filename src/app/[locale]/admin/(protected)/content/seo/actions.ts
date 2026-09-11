"use server";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { seoText } from "@/lib/seo-audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export async function repairSeoAction(locale: string) {
  if (!(await hasValidAdminSession())) throw new Error("نشست مدیریت معتبر نیست.");
  const lang = locale === "en" ? "en" : "fa";
  const fields = ["seoTitleFa","seoTitleEn","seoDescriptionFa","seoDescriptionEn"] as const;
  const [articles,images] = await Promise.all([
    prisma.contentArticle.findMany({where:{OR:fields.flatMap(key=>[{[key]:null},{[key]:""}])},take:100,orderBy:{id:"asc"}}),
    prisma.productImage.findMany({where:{OR:[{altFa:null},{altFa:""},{altEn:null},{altEn:""}]},include:{product:{select:{nameFa:true,nameEn:true,slug:true}}},take:200,orderBy:{id:"asc"}}),
  ]);
  let changed = 0;
  for (const article of articles) {
    const data: Partial<Record<typeof fields[number],string>> = {};
    const proposed = {seoTitleFa:seoText(article.titleFa,65),seoTitleEn:seoText(article.titleEn,65),seoDescriptionFa:seoText(article.excerptFa,160),seoDescriptionEn:seoText(article.excerptEn,160)};
    for (const key of fields) if (!article[key]?.trim() && proposed[key]) data[key]=proposed[key];
    if (!Object.keys(data).length) continue;
    changed += await prisma.$transaction(async tx=>{
      const result = await tx.contentArticle.updateMany({where:{id:article.id,updatedAt:article.updatedAt},data});
      if (result.count) await tx.contentArticleAuditEvent.create({data:{articleId:article.id,eventType:"SEO_EMPTY_METADATA_REPAIRED",payload:{before:Object.fromEntries(Object.keys(data).map(k=>[k,article[k as typeof fields[number]]])),after:data}}});
      return result.count;
    });
    for (const l of ["fa","en"]) revalidatePath(`/${l}/journal/${article.slug}`);
  }
  for (const image of images) {
    const data = { ...(!image.altFa?.trim() && image.product.nameFa.trim() ? {altFa:image.product.nameFa} : {}), ...(!image.altEn?.trim() && image.product.nameEn.trim() ? {altEn:image.product.nameEn} : {}) };
    if (!Object.keys(data).length) continue;
    const result = await prisma.productImage.updateMany({where:{id:image.id,updatedAt:image.updatedAt},data});
    changed += result.count;
    for (const l of ["fa","en"]) revalidatePath(`/${l}/products/${image.product.slug}`);
  }
  for (const l of ["fa","en"]) {revalidatePath(`/${l}/admin/content`); revalidatePath(`/${l}/admin/content/seo`);}
  revalidatePath("/sitemap.xml");
  redirect(`/${lang}/admin/content/seo?repaired=${changed}`);
}
