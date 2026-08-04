import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { FileText, RotateCcw, ShieldCheck, Truck } from "lucide-react";

import { InternalPageShell } from "@/components/internal-page-shell";
import { LuxuryPageHero } from "@/components/luxury-page-hero";

const policySlugs = ["privacy", "terms", "shipping", "returns"] as const;
type PolicySlug = (typeof policySlugs)[number];

type PolicyPageProps = {
  params: Promise<{ locale: string; policy: string }>;
};

type Section = { title: string; paragraphs: string[] };

type PolicyContent = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Section[];
};

const content: Record<PolicySlug, { fa: PolicyContent; en: PolicyContent }> = {
  privacy: {
    fa: {
      eyebrow: "Privacy",
      title: "حریم خصوصی",
      description: "چارچوب کلی نحوه دریافت، استفاده و محافظت از اطلاعات کاربران الوریا.",
      sections: [
        { title: "اطلاعات موردنیاز", paragraphs: ["فقط اطلاعاتی دریافت می‌شود که برای ثبت سفارش، ارسال، پشتیبانی و جلوگیری از سوءاستفاده لازم باشد.", "اطلاعات حساس بانکی نباید در فرم‌های ارتباط یا پیام‌های پشتیبانی وارد شود."] },
        { title: "کاربرد اطلاعات", paragraphs: ["اطلاعات سفارش برای پردازش خرید، ارتباط با مشتری و ارائه خدمات پس از فروش استفاده می‌شود.", "استفاده تحلیلی از داده‌ها باید به‌صورت حداقلی و با رعایت محرمانگی انجام شود."] },
        { title: "نگهداری و امنیت", paragraphs: ["دسترسی به اطلاعات باید محدود، ثبت‌شده و متناسب با مسئولیت افراد باشد.", "نسخه نهایی این سیاست پیش از انتشار تجاری با جزئیات حقوقی و فنی تکمیل می‌شود."] },
      ],
    },
    en: {
      eyebrow: "Privacy",
      title: "Privacy Policy",
      description: "A general framework for how Eloria receives, uses and protects customer information.",
      sections: [
        { title: "Required information", paragraphs: ["Only information needed for ordering, delivery, support and fraud prevention should be collected.", "Sensitive banking details must never be entered into contact forms or support messages."] },
        { title: "How information is used", paragraphs: ["Order information is used to process purchases, communicate with customers and provide after-sales service.", "Analytical use of data should remain minimal and protect customer confidentiality."] },
        { title: "Storage and security", paragraphs: ["Access to information should be limited, logged and appropriate to each role.", "The final policy will receive complete legal and technical detail before commercial launch."] },
      ],
    },
  },
  terms: {
    fa: {
      eyebrow: "Terms",
      title: "شرایط استفاده و خرید",
      description: "اصول عمومی استفاده از وب‌سایت، ثبت سفارش و مسئولیت‌های طرفین.",
      sections: [
        { title: "اطلاعات محصولات", paragraphs: ["مشخصات، وزن، تصاویر و قیمت هر محصول باید تا حد امکان دقیق و به‌روز نمایش داده شود.", "تفاوت جزئی رنگ در نمایشگرهای مختلف می‌تواند رخ دهد و به‌تنهایی نشانه مغایرت محصول نیست."] },
        { title: "قیمت و سفارش", paragraphs: ["قیمت نهایی باید در سمت سرور محاسبه و پیش از پرداخت به مشتری نمایش داده شود.", "ثبت سفارش به‌تنهایی به‌معنای پرداخت موفق یا نهایی‌شدن فروش نیست."] },
        { title: "رفتار مجاز", paragraphs: ["استفاده خودکار، ایجاد سفارش‌های غیرواقعی یا تلاش برای اختلال در موجودی و سامانه ممنوع است.", "نسخه حقوقی نهایی باید پیش از شروع فروش عمومی توسط متخصص بررسی شود."] },
      ],
    },
    en: {
      eyebrow: "Terms",
      title: "Terms of Use and Purchase",
      description: "General principles governing website use, order placement and the responsibilities of each party.",
      sections: [
        { title: "Product information", paragraphs: ["Specifications, weight, imagery and price should be presented as accurately and currently as possible.", "Minor colour differences between displays may occur and do not alone indicate a product mismatch."] },
        { title: "Pricing and orders", paragraphs: ["The final price must be calculated server-side and shown before payment.", "Creating an order does not by itself mean payment succeeded or the sale is final."] },
        { title: "Permitted use", paragraphs: ["Automated misuse, fake orders or attempts to disrupt stock and services are prohibited.", "The final legal version should be reviewed by a qualified professional before public sales begin."] },
      ],
    },
  },
  shipping: {
    fa: {
      eyebrow: "Shipping",
      title: "ارسال و تحویل",
      description: "چارچوب اولیه آماده‌سازی، بسته‌بندی، ارسال و تحویل سفارش‌های الوریا.",
      sections: [
        { title: "آماده‌سازی", paragraphs: ["زمان آماده‌سازی باید در صفحه محصول یا هنگام تسویه‌حساب به‌صورت واضح اعلام شود.", "محصولات سفارشی ممکن است زمان آماده‌سازی متفاوتی داشته باشند."] },
        { title: "بسته‌بندی و ارسال", paragraphs: ["بسته‌بندی باید متناسب با ارزش و حساسیت جواهر انتخاب شود و امکان رهگیری داشته باشد.", "هزینه و روش ارسال باید پیش از پرداخت به مشتری نمایش داده شود."] },
        { title: "تحویل", paragraphs: ["تحویل سفارش‌های ارزشمند می‌تواند نیازمند احراز هویت یا امضای گیرنده باشد.", "شرایط نهایی شهرها، زمان‌بندی و مسئولیت حمل پس از انتخاب شرکت ارسال تکمیل می‌شود."] },
      ],
    },
    en: {
      eyebrow: "Shipping",
      title: "Shipping and Delivery",
      description: "The initial framework for preparation, packaging, dispatch and delivery of Eloria orders.",
      sections: [
        { title: "Preparation", paragraphs: ["Preparation time should be stated clearly on the product page or during checkout.", "Made-to-order products may require a different preparation period."] },
        { title: "Packaging and dispatch", paragraphs: ["Packaging should match the value and sensitivity of the jewelry and support tracking.", "Shipping method and cost must be shown before payment."] },
        { title: "Delivery", paragraphs: ["High-value deliveries may require identity verification or a recipient signature.", "Final city coverage, timing and carrier responsibility will be completed after a delivery partner is selected."] },
      ],
    },
  },
  returns: {
    fa: {
      eyebrow: "Returns",
      title: "مرجوعی و بازپرداخت",
      description: "چارچوب اولیه بررسی مغایرت، آسیب و درخواست بازگشت سفارش.",
      sections: [
        { title: "شرایط بررسی", paragraphs: ["درخواست باید در بازه اعلام‌شده و همراه با شماره سفارش، تصویر بسته‌بندی و توضیح مشکل ثبت شود.", "محصول باید بدون استفاده، همراه متعلقات و در وضعیت قابل بررسی باقی مانده باشد."] },
        { title: "موارد قابل قبول", paragraphs: ["آسیب هنگام تحویل، مغایرت مشخصات یا ارسال محصول اشتباه باید با اولویت بررسی شود.", "قواعد محصولات سفارشی، تغییرسایز داده‌شده یا دارای حک اختصاصی باید جداگانه اعلام شود."] },
        { title: "بازپرداخت", paragraphs: ["بازپرداخت پس از تأیید درخواست و براساس روش پرداخت اولیه انجام می‌شود.", "مدت و فرآیند دقیق بازگشت وجه پس از اتصال درگاه پرداخت نهایی می‌شود."] },
      ],
    },
    en: {
      eyebrow: "Returns",
      title: "Returns and Refunds",
      description: "The initial framework for reviewing mismatches, damage and return requests.",
      sections: [
        { title: "Review requirements", paragraphs: ["A request should be submitted within the stated period with the order number, packaging images and an explanation.", "The product must remain unused, complete and available for inspection."] },
        { title: "Eligible cases", paragraphs: ["Delivery damage, specification mismatch or an incorrect product should receive priority review.", "Rules for custom, resized or engraved products must be stated separately."] },
        { title: "Refunds", paragraphs: ["Refunds are issued after approval and through the original payment method.", "The exact refund timeline will be finalized after the payment gateway is connected."] },
      ],
    },
  },
};

const icons: Record<PolicySlug, typeof ShieldCheck> = {
  privacy: ShieldCheck,
  terms: FileText,
  shipping: Truck,
  returns: RotateCcw,
};

export function generateStaticParams() {
  return policySlugs.map((policy) => ({ policy }));
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { locale, policy } = await params;
  if ((locale !== "fa" && locale !== "en") || !policySlugs.includes(policy as PolicySlug)) notFound();
  setRequestLocale(locale);

  const isPersian = locale === "fa";
  const slug = policy as PolicySlug;
  const page = content[slug][isPersian ? "fa" : "en"];
  const Icon = icons[slug];

  return (
    <InternalPageShell locale={locale}>
      <section className="eloria-page-container relative z-10 pb-28 pt-36 sm:pt-40">
        <LuxuryPageHero
          eyebrow={page.eyebrow}
          title={page.title}
          description={page.description}
          isPersian={isPersian}
          icon={<Icon className="size-6" />}
        />

        <div className="mx-auto mt-12 max-w-5xl space-y-5">
          {page.sections.map((section, index) => (
            <article
              key={section.title}
              data-reveal
              style={{ "--reveal-delay": `${index * 80}ms` } as CSSProperties}
              className="eloria-panel rounded-[2rem] p-6 sm:p-8"
            >
              <div className="flex items-center gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#d9b85f]/24 bg-[#d9b85f]/[0.05] text-sm text-[#e1c370]">
                  {(index + 1).toLocaleString(isPersian ? "fa-IR" : "en-US")}
                </span>
                <h2 className="text-xl font-semibold text-[#f0e2c2] sm:text-2xl">{section.title}</h2>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-8 text-[#d1c3a3]/68 sm:text-base sm:leading-9">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href={`/${locale}/contact`} className="eloria-button-secondary">
            {isPersian ? "پرسش درباره این سیاست" : "Ask about this policy"}
          </Link>
        </div>
      </section>
    </InternalPageShell>
  );
}
