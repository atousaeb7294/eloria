import { SeoRunReport } from "@/components/admin/seo-run-report";
import { restoreSeoChange } from "./restore";
import { editorialFindings } from "@/lib/seo-content-tools";
import { seoAutomationEnabled } from "@/lib/seo-autopilot";
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
  for (const a of articles) for (const issue of editorialFindings(a.contentFa)) findings.push({ path: `/fa/journal/${a.slug}`, issue, severity: "MEDIUM", repairable: false });
  const [latest, articleEvents, imageEvents] = await Promise.all([
    prisma.contentSeoSnapshot.findFirst({ orderBy: { recordedFor: "desc" } }),
    prisma.contentArticleAuditEvent.findMany({ where: { eventType: "SEO_AUTOPILOT_REPAIRED" }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.productTimelineEvent.findMany({ where: { eventType: "SEO_AUTOPILOT_REPAIRED" }, orderBy: { occurredAt: "desc" }, take: 15 }),
  ]);
  const latestIssues = Array.isArray(latest?.issues) ? latest.issues : [];
  const run = latestIssues.find(i => i && typeof i === "object" && !Array.isArray(i) && i.id === "SEO_AUTOPILOT_RUN");
  return <div dir="rtl" className="mx-auto max-w-6xl space-y-6 text-[#eee1c7]">
    <Link href={`/${locale}/admin/content`} className="text-sm text-[#dec478]">بازگشت به محتوا و سئو</Link>
    <h1 className="text-2xl font-semibold">بررسی و اصلاح سئوی فروشگاه</h1>
    <p className="text-sm leading-8 text-[#c9bb9a]">{pages.length} صفحه بررسی شد؛ {findings.length} مورد نیاز به توجه دارد. عنوان و توضیح، تکرار عنوان، تصویر و متن جایگزین و پیوندهای داخلی بررسی می‌شوند. رتبه گوگل، بک‌لینک و سرعت واقعی در این گزارش اندازه‌گیری نمی‌شوند.</p>
    {query.repaired && <p role="status" className="rounded-xl bg-emerald-900/30 p-4">اصلاح خودکار انجام شد؛ {Number(query.repaired)||0} رکورد اصلاح شد. گزارش زیر دوباره محاسبه شده است.</p>}
    <section className="space-y-4 rounded-2xl border border-[#dec478]/25 p-5">
      <h2 className="text-xl">دستیار خودکار سئو و سرعت</h2>
      <p className="text-sm leading-8">{seoAutomationEnabled() ? "اصلاح پس از ذخیرهٔ محتوا فعال است." : "اصلاح خودکار غیرفعال است."} بررسی دوره‌ای با اجرای npm start و CRON_SECRET معتبر، هر ۳۰ دقیقه انجام می‌شود. اندازه‌گیری PageSpeed روزانه انجام می‌شود؛ برای سهمیهٔ پایدارتر، کلید GOOGLE_PAGESPEED_API_KEY قابل تنظیم است. نمرهٔ آزمایشگاهی، رتبهٔ گوگل یا تجربهٔ واقعی همهٔ کاربران نیست.</p>
      <p className="text-sm leading-8">اصلاح خودکار، فیلدهای خالی و نگارش متادیتای فارسی را تکمیل می‌کند؛ Alt از نام ثبت‌شدهٔ محصول ساخته می‌شود و تشخیص بصری سنگ یا جنس نیست. نگارش حروف ی/ک و چند حالت روشن نیم‌فاصله در متن فارسی مقاله اصلاح می‌شود؛ معنی متن، داستان‌ها و اطلاعات تجاری بازنویسی نمی‌شوند. تعداد کلمات و طول عنوان، معیار قطعی رتبه نیستند.</p>
      <SeoRunReport value={run} />
      <h3 className="font-semibold">تاریخچه و بازگشت اصلاحات</h3>
      <p className="text-sm leading-7">بازگشت، فقط در صورت تغییرنکردن مقدار جدید انجام می‌شود و اصلاح خودکار آن مقاله یا محصول را متوقف می‌کند تا دوباره اعمال نشود.</p>
      {[...articleEvents.map(e => ({id:e.id,kind:"article",date:e.createdAt,payload:e.payload})), ...imageEvents.map(e => ({id:e.id,kind:"image",date:e.occurredAt,payload:e.details}))].map(e => <details key={e.id} className="rounded-lg border border-white/10 p-3">
        <summary>{e.kind === "article" ? "اصلاح مقاله" : "اصلاح تصویر محصول"} · {e.date.toISOString().slice(0,16)}</summary>
        <pre dir="ltr" className="my-3 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(e.payload,null,2)}</pre>
        <form action={restoreSeoChange.bind(null,locale)}><input type="hidden" name="id" value={e.id}/><input type="hidden" name="kind" value={e.kind}/><button className="min-h-11 rounded-lg border border-[#dec478]/40 px-4" type="submit">بازگشت این تغییر</button></form>
      </details>)}
    </section>
    <form action={repairSeoAction.bind(null,locale)} className="rounded-2xl border border-[#dec478]/25 p-5">
      <p className="mb-4 text-sm leading-7">اجرای دستی همان اصلاحات محدود و قابل‌بازگشت دستیار را انجام می‌دهد. هر نوبت حداکثر ۴۰ مقاله و ۱۰۰ تصویر بررسی می‌شود؛ اجرای دوره‌ای از ادامهٔ فهرست پیش می‌رود.</p>
      <button className="min-h-12 rounded-full bg-[#dec478] px-6 font-semibold text-[#082a1e]" type="submit">بررسی و اعمال اصلاحات خودکار</button>
    </form>
    <div className="overflow-x-auto rounded-2xl border border-[#dec478]/20"><table className="w-full text-right text-sm"><thead><tr className="bg-white/5"><th className="p-4">صفحه</th><th>ایراد</th><th>اهمیت</th><th>روش اصلاح</th></tr></thead><tbody>{findings.map((f,i)=><tr key={`${f.path}-${i}`} className="border-t border-white/10"><td className="p-4"><Link className="underline" href={f.path}>{f.path}</Link></td><td className="p-3">{f.issue}</td><td>{f.severity === "HIGH" ? "زیاد" : "متوسط"}</td><td className="p-3">{f.repairable ? "بررسی اصلاح خودکار" : "بازبینی محتوا"}</td></tr>)}</tbody></table>{findings.length === 0 && <p className="p-6">در محدوده بررسی فعلی ایرادی پیدا نشد.</p>}</div>
  </div>;
}
