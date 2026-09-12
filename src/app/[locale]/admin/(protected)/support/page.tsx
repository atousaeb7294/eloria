import { notFound } from "next/navigation";

import { AdminSupportInboxClient } from "@/components/admin/admin-support-inbox-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();

  return (
    <div className="mx-auto max-w-[1540px] space-y-7">
      <header>
        <p className="text-xs tracking-[0.25em] text-[#b99e4f]">ELORIA CONCIERGE</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#f7e4b6] sm:text-3xl">پشتیبانی آنلاین مشتری‌ها</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[#9f9279]">این صندوق به گفت‌وگوی پایین فروشگاه متصل است. باز بودن همین صفحه، وضعیت واقعی آنلاین بودن پشتیبان را برای مشتری‌ها فعال می‌کند.</p>
      </header>

      <p className="rounded-xl border border-[#d9b85f]/20 p-4 text-sm leading-7 text-[#d5c7a7]">درخواست‌های پیش‌سفارش با عنوان [PREORDER] در همین صندوق ثبت می‌شوند. برای تأیید تأمین، زمان تحویل و قیمت با شمارهٔ درج‌شده تماس بگیرید؛ این درخواست‌ها پرداخت یا رزرو موجودی ندارند.</p>
      <AdminSupportInboxClient />
    </div>
  );
}
