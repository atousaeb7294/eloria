import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Handshake, Headphones, PackageSearch } from "lucide-react";

import { ContactRequestForm } from "@/components/support-forms";
import { InternalPageShell } from "@/components/internal-page-shell";
import { LuxuryPageHero } from "@/components/luxury-page-hero";

type ContactPageProps = {
  params: Promise<{ locale: string }>;
};

const contactPaths = [
  {
    icon: Headphones,
    fa: { title: "راهنمای انتخاب", description: "برای بررسی دسته‌بندی، جنس، مشخصات و مسیر خرید از این بخش استفاده کنید." },
    en: { title: "Purchase guidance", description: "Use this path for help with categories, materials, specifications and the purchase journey." },
  },
  {
    icon: PackageSearch,
    fa: { title: "پیگیری سفارش", description: "وضعیت سفارش و اطلاعات ثبت‌شده را از صفحه پیگیری بررسی کنید." },
    en: { title: "Order tracking", description: "Review your order status and submitted details through the tracking page." },
  },
  {
    icon: Handshake,
    fa: { title: "همکاری با الوریا", description: "درخواست‌های همکاری، رسانه‌ای و تجاری در فرم ارتباط ثبت می‌شوند." },
    en: { title: "Work with Eloria", description: "Partnership, media and business enquiries can be recorded through the contact form." },
  },
] as const;

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  setRequestLocale(locale);
  const isPersian = locale === "fa";

  return (
    <InternalPageShell locale={locale}>
      <section className="eloria-page-container relative z-10 pb-28 pt-36 sm:pt-40">
        <LuxuryPageHero
          eyebrow="Eloria Support"
          title={isPersian ? "ارتباط با الوریا" : "Contact Eloria"}
          description={
            isPersian
              ? "برای راهنمایی خرید، پیگیری سفارش یا پیشنهاد همکاری، مسیر مناسب را انتخاب کنید. اطلاعات تماس رسمی پس از نهایی‌شدن کانال‌های پشتیبانی در همین صفحه قرار می‌گیرد."
              : "Choose the appropriate path for purchase guidance, order tracking or partnership enquiries. Official contact channels will appear here once support operations are finalized."
          }
          isPersian={isPersian}
          actions={
            <>
              <Link className="eloria-button-primary" href={`/${locale}/order-tracking`}>
                {isPersian ? "پیگیری سفارش" : "Track an order"}
              </Link>
              <Link className="eloria-button-secondary" href={`/${locale}/products`}>
                {isPersian ? "مشاهده جواهرها" : "Browse jewelry"}
              </Link>
            </>
          }
        />

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {contactPaths.map((path, index) => {
            const Icon = path.icon;
            const content = path[isPersian ? "fa" : "en"];
            return (
              <article
                key={path.en.title}
                data-reveal
                style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
                className="eloria-panel rounded-[2rem] p-6 transition duration-500 hover:-translate-y-1 hover:border-[#dfc16f]/36"
              >
                <span className="grid size-13 place-items-center rounded-2xl border border-[#dfc16f]/24 bg-[#dfc16f]/[0.055] text-[#e2c46f]">
                  <Icon className="size-6" />
                </span>
                <h2 className="mt-5 text-xl font-semibold text-[#f0e2c2]">{content.title}</h2>
                <p className="mt-3 text-sm leading-8 text-[#cdbf9f]/66">{content.description}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <ContactRequestForm locale={locale} />
          <aside data-reveal="right" className="eloria-panel rounded-[2.2rem] p-6 sm:p-8">
            <p className="eloria-kicker">{isPersian ? "پیش از ارسال" : "Before sending"}</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#f2e4c5]">
              {isPersian ? "اطلاعات لازم را آماده کنید" : "Prepare the essential details"}
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-8 text-[#d4c6a7]/68">
              <p>{isPersian ? "شماره سفارش را برای درخواست‌های مربوط به خرید بنویسید." : "Include the order number for purchase-related requests."}</p>
              <p>{isPersian ? "نام محصول یا لینک آن را برای راهنمایی انتخاب اضافه کنید." : "Add the product name or link when requesting selection guidance."}</p>
              <p>{isPersian ? "اطلاعات کارت بانکی، رمز یا کدهای امنیتی را در پیام وارد نکنید." : "Never include bank-card data, passwords or security codes in your message."}</p>
            </div>
          </aside>
        </div>
      </section>
    </InternalPageShell>
  );
}
