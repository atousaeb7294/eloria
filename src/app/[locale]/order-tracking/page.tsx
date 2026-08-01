import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CircleCheckBig, Clock3, PackageSearch } from "lucide-react";

import { InternalPageShell } from "@/components/internal-page-shell";
import { LuxuryPageHero } from "@/components/luxury-page-hero";
import { OrderTrackingForm } from "@/components/support-forms";

type OrderTrackingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  setRequestLocale(locale);
  const isPersian = locale === "fa";

  const steps = isPersian
    ? ["ثبت سفارش", "تأیید اطلاعات", "آماده‌سازی و ارسال"]
    : ["Order placed", "Details confirmed", "Preparation and dispatch"];

  return (
    <InternalPageShell locale={locale}>
      <section className="eloria-page-container relative z-10 pb-28 pt-36 sm:pt-40">
        <LuxuryPageHero
          eyebrow="Order Journey"
          title={isPersian ? "پیگیری سفارش" : "Track Your Order"}
          description={
            isPersian
              ? "شماره سفارش و شماره موبایل ثبت‌شده هنگام خرید را وارد کنید. این صفحه از نظر ظاهری آماده است و پس از تکمیل سامانه سفارش، وضعیت واقعی را نمایش می‌دهد."
              : "Enter the order number and phone used during checkout. The interface is ready and will display real status once the order system is completed."
          }
          isPersian={isPersian}
          icon={<PackageSearch className="size-6" />}
        />

        <div className="mt-12">
          <OrderTrackingForm locale={locale} />
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step}
              data-reveal
              style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
              className="eloria-panel rounded-[1.8rem] p-5 text-center"
            >
              <span className="mx-auto grid size-12 place-items-center rounded-full border border-[#d9b85f]/26 bg-[#d9b85f]/[0.05] text-[#dfc16e]">
                {index === 2 ? <Clock3 className="size-5" /> : <CircleCheckBig className="size-5" />}
              </span>
              <p className="mt-4 text-sm font-medium text-[#ecdfc4]">{step}</p>
              <p className="mt-2 text-xs leading-6 text-[#cbbd9d]/58">
                {isPersian ? `مرحله ${index + 1}` : `Step ${index + 1}`}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href={`/${locale}/contact`} className="eloria-button-secondary">
            {isPersian ? "نیاز به راهنمایی دارم" : "I need support"}
          </Link>
        </div>
      </section>
    </InternalPageShell>
  );
}
