import { hasValidAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { moderateReview, updatePreorder } from "./actions";
import {
  preorderLabels,
  allowedPreorderTransition,
  reviewRisk,
} from "@/lib/buyer-commerce-policy";
export const dynamic = "force-dynamic";
export default async function CommercePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string; error?: string; done?: string }>;
}) {
  if (!(await hasValidAdminSession())) notFound();
  const { locale } = await params;
  const q = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(q.page)) || 1));
  const status = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"].includes(
    q.status || "",
  )
    ? q.status
    : "PENDING";
  const [reviews, preorders] = await Promise.all([
    prisma.buyerReview.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 30,
      skip: (page - 1) * 30,
    }),
    prisma.preorderRequest.findMany({
      orderBy: { updatedAt: "desc" },
      take: 30,
      skip: (page - 1) * 30,
    }),
  ]);
  const cls = "w-full rounded-lg border border-white/20 bg-[#041b13] p-3";
  return (
    <div className="space-y-8" dir="rtl">
      <h1 className="text-2xl">نظر خریداران و پیش‌سفارش‌ها</h1>{q.error && <p role="alert" className="rounded-xl border border-red-300/30 p-4 text-red-200">{q.error.slice(0,500)}</p>}{q.done==="1" && <p role="status">تغییرات ثبت شد.</p>}
      <p>
        نظر منفیِ مرتبط با خرید هم قابل انتشار است. اطلاعات شخصی، توهین و تبلیغ
        را منتشر نکنید. متن و امتیاز خریدار تغییر داده نمی‌شود.
      </p>
      <nav className="flex flex-wrap gap-4">
        {["PENDING", "APPROVED", "REJECTED", "HIDDEN"].map((s, i) => (
          <a key={s} href={`?status=${s}`}>
            {["منتظر بررسی", "منتشرشده", "ردشده", "پنهان‌شده"][i]}
          </a>
        ))}
      </nav>
      <h2 className="text-xl">نظرها</h2>
      {reviews.length === 0 && <p>نظری در این وضعیت نیست.</p>}
      {reviews.map((r) => (
        <article
          key={r.id}
          className="rounded-xl border border-white/20 p-5 space-y-3 break-words"
        >
          <p>
            {r.displayName} · {r.rating}/۵
          </p>
          <p className="whitespace-pre-wrap">{r.body}</p>
          {reviewRisk(r.body + " " + r.displayName) && (
            <p className="text-amber-300">
              احتمال وجود اطلاعات تماس یا لینک؛ با دقت بررسی کنید.
            </p>
          )}
          <p className="text-xs">
            محصول: {r.productId} · سفارش: {r.orderId}
          </p>
          <form
            action={moderateReview.bind(null, locale)}
            className="space-y-3"
          >
            <input type="hidden" name="id" value={r.id} />
            <label className="block">
              تصمیم
              <select name="status" className={cls}>
                <option value="APPROVED">تأیید و انتشار</option>
                <option value="REJECTED">رد</option>
                <option value="HIDDEN">پنهان کردن</option>
              </select>
            </label>
            <label className="block">
              دلیل مدیریت
              <input name="reason" maxLength={500} className={cls} />
            </label>
            <button className={cls}>ثبت تصمیم</button>
          </form>
        </article>
      ))}
      <h2 className="text-xl">پیش‌سفارش‌ها</h2>
      <p>
        پس از تأمین، موجودی محصول را در مدیریت محصولات ثبت کنید. مشتری از صفحهٔ
        محصول با قیمت جاری خرید می‌کند؛ این درخواست به‌تنهایی موجودی رزرو
        نمی‌کند. برای اتصال سفارش، مشتری باید با حساب دارای شمارهٔ تأییدشده
        درخواست خود را پیگیری کند.
      </p>
      {preorders.map((p) => (
        <article
          key={p.id}
          className="rounded-xl border border-white/20 p-5 space-y-3 break-words"
        >
          <p>
            {p.name} · {p.phone} · تعداد {p.quantity}
          </p>
          <p>
            {p.id} — {preorderLabels[p.status]}
          </p>
          <p>{p.notes}</p>
          <p>{p.deliveryNote}</p>
          {Object.keys(preorderLabels).some((s) =>
            allowedPreorderTransition(p.status, s),
          ) && (
            <form
              action={updatePreorder.bind(null, locale)}
              className="space-y-3"
            >
              <input type="hidden" name="id" value={p.id} />
              <label className="block">
                وضعیت بعدی
                <select name="status" className={cls}>
                  {Object.entries(preorderLabels)
                    .filter(([s]) => allowedPreorderTransition(p.status, s))
                    .map(([s, label]) => (
                      <option key={s} value={s}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                زمان تحویل و توضیح قابل نمایش به مشتری
                <input name="deliveryNote" maxLength={500} className={cls} />
              </label>
              <label className="block">
                شمارهٔ سفارش پرداخت‌شده (برای اتصال)
                <input name="orderNumber" className={cls} />
              </label>
              <button className={cls}>ثبت وضعیت و اعلان حساب مشتری</button>
            </form>
          )}
        </article>
      ))}
      <nav className="flex gap-6">
        {page > 1 && <a href={`?page=${page - 1}&status=${status}`}>قبلی</a>}
        {(reviews.length === 30 || preorders.length === 30) && (
          <a href={`?page=${page + 1}&status=${status}`}>بعدی</a>
        )}
      </nav>
    </div>
  );
}
