import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Handshake, Headphones, PackageSearch, Scale } from "lucide-react";

import { ContactRequestForm } from "@/components/support-forms";
import { InternalPageShell } from "@/components/internal-page-shell";
import { LuxuryPageHero } from "@/components/luxury-page-hero";
import { legalBusinessIdentity } from "@/lib/legal-business";

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
  const seller = legalBusinessIdentity();

  return (
    <InternalPageShell locale={locale}>
      <section className="eloria-page-container relative z-10 pb-28 pt-36 sm:pt-40">
        <LuxuryPageHero
          eyebrow="Eloria Support"
          title={isPersian ? "ارتباط با الوریا" : "Contact Eloria"}
          description={
            isPersian
              ? "برای راهنمایی خرید، پیگیری سفارش، ثبت درخواست حقوق مصرف‌کننده یا پیشنهاد همکاری از فرم رسمی همین صفحه استفاده کنید."
              : "Use the official form on this page for purchase guidance, order tracking, consumer-rights requests or partnership enquiries."
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
            const item = path[isPersian ? "fa" : "en"];
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
                <h2 className="mt-5 text-xl font-semibold text-[#f0e2c2]">{item.title}</h2>
                <p className="mt-3 text-sm leading-8 text-[#cdbf9f]/66">{item.description}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <ContactRequestForm locale={locale} />

          <div className="space-y-6">
            <aside data-reveal="right" className="eloria-panel rounded-[2.2rem] p-6 sm:p-8">
              <p className="eloria-kicker">{isPersian ? "پیش از ارسال" : "Before sending"}</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#f2e4c5]">
                {isPersian ? "اطلاعات لازم را آماده کنید" : "Prepare the essential details"}
              </h2>
              <div className="mt-6 space-y-4 text-sm leading-8 text-[#d4c6a7]/68">
                <p>{isPersian ? "شماره سفارش را برای درخواست‌های مربوط به خرید بنویسید." : "Include the order number for purchase-related requests."}</p>
                <p>{isPersian ? "برای انصراف، مرجوعی یا مغایرت، نوع درخواست را به‌صورت روشن در پیام بنویسید تا ثبت آن قابل پیگیری باشد." : "For withdrawal, return or mismatch requests, state the request type clearly so it can be tracked."}</p>
                <p>{isPersian ? "اطلاعات کارت بانکی، رمز، CVV2 یا کدهای امنیتی را در پیام وارد نکنید." : "Never include bank-card credentials, passwords, CVV2 or security codes in your message."}</p>
              </div>
            </aside>

            <aside data-reveal="right" className="eloria-panel rounded-[2.2rem] p-6 sm:p-8">
              <span className="grid size-12 place-items-center rounded-2xl border border-[#dfc16f]/24 bg-[#dfc16f]/[0.055] text-[#e2c46f]">
                <Scale className="size-6" />
              </span>
              <p className="eloria-kicker mt-5">{isPersian ? "اطلاعات فروشنده" : "Seller information"}</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#f2e4c5]">{seller.sellerName}</h2>

              {seller.complete ? (
                <div className="mt-5 space-y-3 text-sm leading-8 text-[#d4c6a7]/68">
                  <p>{seller.businessAddress}</p>
                  {seller.supportPhone ? <a className="block underline-offset-4 hover:underline" href={`tel:${seller.supportPhone}`}>{seller.supportPhone}</a> : null}
                  {seller.supportEmail ? <a className="block underline-offset-4 hover:underline" href={`mailto:${seller.supportEmail}`}>{seller.supportEmail}</a> : null}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-8 text-[#d4c6a7]/68">
                  {isPersian
                    ? "فروش آنلاین در حالت پیش‌راه‌اندازی است. مشخصات قانونی و راه تماس مستقیم فروشنده قبل از فعال‌شدن Commerce در تنظیمات Production اجباری است."
                    : "Online commerce is in pre-launch mode. Legal seller details and a direct contact method are required in Production before Commerce can be enabled."}
                </p>
              )}
            </aside>
          </div>
        </div>
      </section>
    </InternalPageShell>
  );
}