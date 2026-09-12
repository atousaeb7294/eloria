import { hasValidAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { isSiteMeasurementEnabled } from "@/lib/site-measurement";
export const dynamic = "force-dynamic";
function windowStart() {
  return new Date(Date.now() - 30 * 86400000);
}
export default async function Operations() {
  if (!(await hasValidAdminSession())) notFound();
  const since = windowStart();
  const [events, paid, products, pending] = await Promise.all([
    prisma.siteMeasurementEvent.groupBy({
      by: ["eventType"],
      where: { occurredAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.order.count({
      where: {
        paidAt: { gte: since },
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] },
      },
    }),
    prisma.product.count({
      where: {
        status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
        collection: { isActive: true },
      },
    }),
    prisma.buyerReview.count({ where: { status: "PENDING" } }),
  ]);
  const labels: Record<string, string> = {
    view_item: "مشاهدهٔ محصول",
    add_to_cart: "افزودن به سبد",
    begin_checkout: "آغاز تسویه",
  };
  return (
    <div className="space-y-7" dir="rtl">
      <h1 className="text-2xl">پایش و آمادگی فروشگاه</h1>
      <p>
        آمار ۳۰ روز اخیر؛ رخدادهای مرورگر فقط با رضایت بازدیدکننده ثبت می‌شوند و
        تعداد افراد یکتا یا قیف هم‌گروه نیستند. سفارش پرداخت‌شده از دیتابیس
        محاسبه می‌شود؛ از تقسیم این دو منبع نرخ تبدیل دقیق به دست نمی‌آید.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key} className="rounded-xl border border-white/20 p-5">
            <h2>{label}</h2>
            <p className="text-2xl">
              {events.find((e) => e.eventType === key)?._count._all ?? 0}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-white/20 p-5">
          سفارش پرداخت‌شده: {paid}
        </div>
        <div className="rounded-xl border border-white/20 p-5">
          محصول قابل نمایش: {products}
        </div>
        <div className="rounded-xl border border-white/20 p-5">
          نظر منتظر بررسی: {pending}
        </div>
      </div>
      <h2 className="text-xl">وضعیت اتصال‌ها</h2>
      <p>
        ثبت آمار با رضایت:{" "}
        {isSiteMeasurementEnabled()
          ? "فعال"
          : "غیرفعال؛ ELORIA_MEASUREMENT_ENABLED=true"}
      </p>
      <p>
        توکن تأیید گوگل:{" "}
        {process.env.GOOGLE_SITE_VERIFICATION
          ? "تنظیم شده؛ تأیید نهایی در Search Console انجام شود"
          : "تنظیم نشده"}
      </p>
      <a
        className="block underline"
        href="https://search.google.com/search-console"
      >
        ورود به Search Console
      </a>
      <p>فایل نقشهٔ سایت: /sitemap.xml</p>
      <h2 className="text-xl">پایش بیرونی و نسخهٔ پشتیبان</h2>
      <p>
        ابزار scripts/operations-agent.mjs باید روی ماشین مستقل و همیشه‌روشن
        اجرا شود. بررسی سلامت هر دقیقه و نسخهٔ پشتیبان روزانه است. این صفحه بدون
        رسید اجرای ابزار، موفق بودن پشتیبان یا پایش بیرونی را تأیید نمی‌کند.
      </p>
      <p>
        نسخهٔ پشتیبان شامل دیتابیس است. تصاویر ذخیره‌شده در فضای ابری، تنظیمات و
        کلید رمزگشایی را جداگانه و خارج از سرور نگه دارید. بازیابی آزمایشی در
        دیتابیس خالی و جداگانه با scripts/backup-database.mjs انجام می‌شود.
      </p>
    </div>
  );
}
