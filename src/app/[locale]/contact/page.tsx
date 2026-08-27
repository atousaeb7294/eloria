import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Handshake, Headphones, PackageSearch, PhoneCall, Scale } from "lucide-react";

import { ContactRequestForm } from "@/components/support-forms";
import { InternalPageShell } from "@/components/internal-page-shell";
import { LuxuryPageHero } from "@/components/luxury-page-hero";
import { legalBusinessIdentity, publicSupportPhone } from "@/lib/legal-business";

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
  const phone = publicSupportPhone();

  return (
    <InternalPageShell locale={locale}>
      <section className="eloria-page-container relative z-10 pb-28 pt-36 sm:pt-40">
        <LuxuryPageHero
          eyebrow="Eloria Support"
          title={isPersian ? "ارتباط با الوریا" : "Contact Eloria"}
          description={
            isPersian
              ? "برای راهنمایی خرید، پیگیری سفارش یا ثبت درخواست، از فرم رسمی استفاده کنید یا مستقیماً با الوریا تماس بگیرید."
              : "Use the official form for purchase guidance, order tracking or requests, or call Eloria directly."
          }
          isPersian={isPersian}
          actions={
            <>
              <a className="eloria-button-primary" href={`tel:${phone}`}>
                <PhoneCall className="size-4" />
                {isPersian ? `تماس مستقیم · ${phone}` : `Call directly · ${phone}`}
              </a>
              <Link className="eloria-button-secondary" href={`/${locale}/order-tracking`}>
                {isPersian ? "پیگیری سفارش" : "Track an order"}
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
          <div className="overflow-hidden rounded-[2.25rem] border border-[#dfc16f]/18 bg-[linear-gradient(145deg,rgba(7,39,29,.92),rgba(2,20,14,.965))] p-1 shadow-[0_26px_90px_rgba(0,0,0,.30)]">
            <ContactRequestForm locale={locale} />
          </div>

          <div className="space-y-6">
            <aside data-reveal="right" className="eloria-panel rounded-[2.2rem] p-6 sm:p-8">
              <span className="grid size-12 place-items-center rounded-2xl border border-[#dfc16f]/24 bg-[#dfc16f]/[0.055] text-[#e2c46f]">
                <PhoneCall className="size-6" />
              </span>
              <p className="eloria-kicker mt-5">{isPersian ? "تماس مستقیم" : "Direct contact"}</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#f2e4c5]">{isPersian ? "گفت‌وگو با الوریا" : "Speak with Eloria"}</h2>
              <p className="mt-4 text-sm leading-8 text-[#d4c6a7]/68">
                {isPersian ? "برای پرسش‌های فوری خرید و سفارش می‌توانید مستقیماً با شماره زیر تماس بگیرید." : "For urgent purchase and order questions, call the number below directly."}
              </p>
              <a href={`tel:${phone}`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-[#e2c46f]/34 bg-[#d8b85e]/[.075] px-5 text-sm font-semibold text-[#f0d98d] transition hover:border-[#f0d98d]/70 hover:bg-[#d8b85e]/[.12]">
                <PhoneCall className="size-4" />
                <span dir="ltr">{phone}</span>
              </a>
            </aside>

            <aside data-reveal="right" className="eloria-panel rounded-[2.2rem] p-6 sm:p-8">
              <p className="eloria-kicker">{isPersian ? "پیش از ارسال" : "Before sending"}</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#f2e4c5]">
                {isPersian ? "اطلاعات لازم را آماده کنید" : "Prepare the essential details"}
              </h2>
              <div className="mt-6 space-y-4 text-sm leading-8 text-[#d4c6a7]/68">
                <p>{isPersian ? "شماره سفارش را برای درخواست‌های مربوط به خرید بنویسید." : "Include the order number for purchase-related requests."}</p>
                <p>{isPersian ? "برای انصراف، مرجوعی یا مغایرت، نوع درخواست را روشن بنویسید تا قابل پیگیری باشد." : "For withdrawal, return or mismatch requests, state the request type clearly so it can be tracked."}</p>
                <p>{isPersian ? "اطلاعات کارت بانکی، رمز، CVV2 یا کدهای امنیتی را در پیام وارد نکنید." : "Never include bank-card credentials, passwords, CVV2 or security codes in your message."}</p>
              </div>
            </aside>

            <aside data-reveal="right" className="eloria-panel rounded-[2.2rem] p-6 sm:p-8">
              <span className="grid size-12 place-items-center rounded-2xl border border-[#dfc16f]/24 bg-[#dfc16f]/[0.055] text-[#e2c46f]">
                <Scale className="size-6" />
              </span>
              <p className="eloria-kicker mt-5">{isPersian ? "راه ارتباط رسمی" : "Official contact"}</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#f2e4c5]">{seller.sellerName}</h2>
              <div className="mt-5 space-y-3 text-sm leading-8 text-[#d4c6a7]/68">
                <a className="block underline-offset-4 hover:underline" href={`tel:${phone}`} dir="ltr">{phone}</a>
                {seller.supportEmail ? <a className="block underline-offset-4 hover:underline" href={`mailto:${seller.supportEmail}`}>{seller.supportEmail}</a> : null}
              </div>
              {!seller.complete ? (
                <p className="mt-5 text-xs leading-7 text-[#b9aa88]/48">
                  {isPersian ? "نشانی فروشگاه در این صفحه نمایش داده نمی‌شود؛ برای ارتباط از شماره مستقیم یا فرم رسمی استفاده کنید." : "The store address is not displayed on this page; use the direct phone number or the official form."}
                </p>
              ) : null}
            </aside>
          </div>
        </div>
      </section>
    </InternalPageShell>
  );
}
