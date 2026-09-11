import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auditSeoPages, seoText, type SeoAuditPage } from "@/lib/seo-audit";
import { repairSeoAction } from "@/app/[locale]/admin/(protected)/content/seo/actions";
export const dynamic = "force-dynamic";
export default async function SeoAuditPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ repaired?: string }>;
}) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  const query = await searchParams;
  const [products, articles] = await Promise.all([
    prisma.product.findMany({ where: { status: { in: ["ACTIVE", "OUT_OF_STOCK"] } }, select: { id:true, slug:true, nameFa:true, nameEn:true, descriptionFa:true, descriptionEn:true, images:{select:{altFa:true,altEn:true}} } }),
    prisma.contentArticle.findMany({ where:{status:"PUBLISHED"}, select:{id:true,slug:true,seoTitleFa:true,seoTitleEn:true,seoDescriptionFa:true,seoDescriptionEn:true,coverImageUrl:true,contentFa:true,contentEn:true} }),
  ]);
  const pages: SeoAuditPage[] = [];
  for (const lang of ["fa","en"] as const) {
    for (const p of products) pages.push({ id:p.id, path:`/${lang}/products/${encodeURIComponent(p.slug)}`, title:lang === "fa" ? p.nameFa : p.nameEn, description:seoText((lang === "fa" ? p.descriptionFa : p.descriptionEn) || "",160), hasImage:p.images.length>0, missingAlt:p.images.some(i=>!(lang === "fa" ? i.altFa : i.altEn)?.trim()) });
    for (const a of articles) pages.push({id:a.id,path:`/${lang}/journal/${encodeURIComponent(a.slug)}`, title:(lang === "fa" ? a.seoTitleFa : a.seoTitleEn)||"", description:(lang === "fa" ? a.seoDescriptionFa : a.seoDescriptionEn)||"",hasImage:Boolean(a.coverImageUrl),missingAlt:false,internalLinkCount:((lang === "fa" ? a.contentFa : a.contentEn).match(/\]\(\/(?!\/)|href=["']\/(?!\/)/g)||[]).length});
  }
  const findings = auditSeoPages(pages);
  return <div dir="rtl" className="mx-auto max-w-6xl space-y-6 text-[#eee1c7]">
    <Link href={`/${locale}/admin/content`} className="text-sm text-[#dec478]">بازگشت به محتوا و سئو</Link>
    <h1 className="text-2xl font-semibold">بررسی و اصلاح سئوی فروشگاه</h1>
    <p className="text-sm leading-8 text-[#c9bb9a]">{pages.length} صفحه بررسی شد؛ {findings.length} مورد نیاز به توجه دارد. عنوان و توضیح، تکرار عنوان، تصویر و متن جایگزین و پیوندهای داخلی بررسی می‌شوند. رتبه گوگل، بک‌لینک و سرعت واقعی در این گزارش اندازه‌گیری نمی‌شوند.</p>
    {query.repaired && <p role="status" className="rounded-xl bg-emerald-900/30 p-4">اصلاح خودکار انجام شد؛ {Number(query.repaired)||0} رکورد اصلاح شد. گزارش زیر دوباره محاسبه شده است.</p>}
    <form action={repairSeoAction.bind(null,locale)} className="rounded-2xl border border-[#dec478]/25 p-5">
      <p className="mb-4 text-sm leading-7">اصلاح خودکار فقط عنوان و توضیح سئوی خالی مقاله را از متن موجود و متن جایگزین خالی تصویر محصول را از نام محصول تکمیل می‌کند. محتوای صفحه و موارد نیازمند نگارش در فهرست بازبینی می‌مانند. هر بار حداکثر ۱۰۰ مقاله و ۲۰۰ تصویر پردازش می‌شود.</p>
      <button className="min-h-12 rounded-full bg-[#dec478] px-6 font-semibold text-[#082a1e]" type="submit">بررسی و اعمال اصلاحات خودکار</button>
    </form>
    <div className="overflow-x-auto rounded-2xl border border-[#dec478]/20"><table className="w-full text-right text-sm"><thead><tr className="bg-white/5"><th className="p-4">صفحه</th><th>ایراد</th><th>اهمیت</th><th>روش اصلاح</th></tr></thead><tbody>{findings.map((f,i)=><tr key={`${f.path}-${i}`} className="border-t border-white/10"><td className="p-4"><Link className="underline" href={f.path}>{f.path}</Link></td><td className="p-3">{f.issue}</td><td>{f.severity === "HIGH" ? "زیاد" : "متوسط"}</td><td className="p-3">{f.repairable ? "بررسی اصلاح خودکار" : "بازبینی محتوا"}</td></tr>)}</tbody></table>{findings.length === 0 && <p className="p-6">در محدوده بررسی فعلی ایرادی پیدا نشد.</p>}</div>
  </div>;
}
