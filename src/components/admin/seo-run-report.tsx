import type { Prisma } from "@/generated/prisma/client";
import type { PerformanceReading } from "@/lib/seo-performance";
type Report = { checkedAt?: string; changed?: number; disabled?: boolean; performance?: PerformanceReading[]; pageScan?: {totalPages?: number;pages?: {url:string;status:number;checkedAt?:string;findings:string[]}[]} };
export function SeoRunReport({ value }: { value: Prisma.JsonValue | undefined }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return <p role="status">هنوز اجرای دوره‌ای ثبت نشده است؛ نبود گزارش به معنی سالم‌بودن یا سریع‌بودن سایت نیست.</p>;
  const report = value as Report;
  return <div className="space-y-5">
    <p className="text-sm leading-7">آخرین اجرا: <time dir="ltr">{report.checkedAt?.replace("T"," ").slice(0,19)} UTC</time> · {report.changed || 0} اصلاح · {report.disabled ? "خودکارسازی خاموش" : "خودکارسازی روشن"}</p>
    <div className="grid gap-4 md:grid-cols-2">{report.performance?.map((p,index)=><article key={index} className="rounded-xl border border-white/15 p-4">
      <h3 className="font-semibold">{p.device === "mobile" ? "سرعت موبایل" : p.device === "desktop" ? "سرعت دسکتاپ" : "اندازه‌گیری سرعت"}</h3>
      <p className="mt-2 break-all text-xs" dir="ltr">{p.url}</p>
      {p.status === "MEASURED_LAB" ? <dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><dt>امتیاز آزمایشگاهی</dt><dd>{p.score}/100</dd><dt>LCP</dt><dd>{p.lcpMs === undefined ? "—" : `${(p.lcpMs/1000).toFixed(2)} ثانیه`}</dd><dt>CLS</dt><dd>{p.cls?.toFixed(3) ?? "—"}</dd><dt>زمان انسداد TBT</dt><dd>{p.tbtMs === undefined ? "—" : `${Math.round(p.tbtMs)} ms`}</dd></dl> : <p className="mt-3 text-sm leading-7">{p.message || "اندازه‌گیری در دسترس نیست؛ امتیازی ساخته نشده است."}</p>}
      <p className="mt-3 text-xs">زمان اندازه‌گیری: {p.checkedAt.slice(0,16)} UTC</p>
    </article>)}</div>
    <h3 className="font-semibold">بررسی دوره‌ای صفحات ({report.pageScan?.totalPages ?? "—"} آدرس در چرخه)</h3>
    <p className="text-xs leading-7">هر نوبت سه صفحه بررسی می‌شود. گزارش حداکثر ۱۰۰۰ آدرس نگه‌داری می‌شود و ۱۰۰ مورد اخیر در این صفحه نمایش داده می‌شود. صحت ساختار JSON-LD بررسی می‌شود؛ واجد شرایط بودن نتیجهٔ ویژهٔ گوگل تضمین نمی‌شود.</p>
    {report.pageScan?.pages?.slice(0,100).map(p=><article key={p.url} className="rounded-xl border border-white/10 p-4"><a className="block break-all text-sm underline" dir="ltr" href={p.url}>{p.url}</a><p className="my-2 text-xs">پاسخ HTTP: {p.status || "دریافت ناموفق"} · {p.checkedAt?.slice(0,16)}</p>{p.findings.length ? <ul className="list-inside list-disc space-y-2 text-sm">{p.findings.map((f,i)=><li key={i}>{f}</li>)}</ul> : <p className="text-sm">در محدودهٔ بررسی این نوبت، ایرادی پیدا نشد.</p>}</article>)}
  </div>;
}
