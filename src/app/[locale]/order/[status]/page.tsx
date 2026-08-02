import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CheckCircle2, CircleX, PackageSearch, ShoppingBag } from "lucide-react";

import { InternalPageShell } from "@/components/internal-page-shell";
import { LuxuryPageHero } from "@/components/luxury-page-hero";

const statuses = ["success", "failed"] as const;
type Status = (typeof statuses)[number];

type OrderResultPageProps = {
  params: Promise<{ locale: string; status: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return statuses.map((status) => ({ status }));
}

export default async function OrderResultPage({ params, searchParams }: OrderResultPageProps) {
  const { locale, status } = await params;
  if ((locale !== "fa" && locale !== "en") || !statuses.includes(status as Status)) notFound();
  setRequestLocale(locale);

  const isPersian = locale === "fa";
  const successful = status === "success";
  const query = await searchParams;
  const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const orderNumber = one(query.order);
  const referenceId = one(query.ref);

  const copy = successful
    ? isPersian
      ? {
          eyebrow: "Order Confirmed",
          title: "سفارش با موفقیت ثبت شد",
          description: "این صفحه برای نمایش نتیجه موفق سفارش آماده شده است. شماره سفارش، رسید و اطلاعات پرداخت پس از اتصال کامل درگاه در همین بخش نمایش داده می‌شود.",
          note: "برای بررسی ادامه مسیر سفارش از صفحه پیگیری استفاده کنید.",
        }
      : {
          eyebrow: "Order Confirmed",
          title: "Your order was placed successfully",
          description: "This success state is ready. The order number, receipt and payment details will appear here after the payment gateway is fully connected.",
          note: "Use the tracking page to follow the next stages of your order.",
        }
    : isPersian
      ? {
          eyebrow: "Payment Interrupted",
          title: "ثبت سفارش کامل نشد",
          description: "پرداخت یا تأیید سفارش تکمیل نشده است. تا زمان اتصال نهایی درگاه، این صفحه فقط وضعیت ظاهری شکست را نمایش می‌دهد و هیچ مبلغی را تأیید نمی‌کند.",
          note: "سبد خرید شما محفوظ می‌ماند و می‌توانید دوباره مسیر تسویه‌حساب را بررسی کنید.",
        }
      : {
          eyebrow: "Payment Interrupted",
          title: "The order was not completed",
          description: "Payment or order confirmation did not finish. Until the gateway is connected, this page only represents the visual failure state and confirms no charge.",
          note: "Your cart remains available so you can review checkout again.",
        };

  return (
    <InternalPageShell locale={locale}>
      <section className="eloria-page-container relative z-10 flex min-h-[78vh] items-center pb-24 pt-36 sm:pt-40">
        <div className="w-full">
          <LuxuryPageHero
            eyebrow={copy.eyebrow}
            title={copy.title}
            description={copy.description}
            isPersian={isPersian}
            icon={successful ? <CheckCircle2 className="size-7 text-emerald-200" /> : <CircleX className="size-7 text-rose-200" />}
          />

          <div data-reveal className="eloria-panel mx-auto mt-10 max-w-3xl rounded-[2.2rem] p-6 text-center sm:p-9">
            <p className="text-sm leading-8 text-[#d6c8a8]/70">{copy.note}</p>
            {orderNumber ? (
              <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#d9b85f]/18 bg-black/10 p-4 text-sm text-[#e8d7af]">
                <div className="flex justify-between gap-4"><span>{isPersian ? "شماره سفارش" : "Order number"}</span><span dir="ltr" className="text-[#efd985]">{orderNumber}</span></div>
                {referenceId ? <div className="mt-3 flex justify-between gap-4"><span>{isPersian ? "کد پیگیری پرداخت" : "Payment reference"}</span><span dir="ltr" className="text-[#efd985]">{referenceId}</span></div> : null}
              </div>
            ) : null}
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={`/${locale}/order-tracking`} className="eloria-button-primary">
                <PackageSearch className="size-4" />
                {isPersian ? "پیگیری سفارش" : "Track order"}
              </Link>
              <Link href={successful ? `/${locale}/products` : `/${locale}/checkout`} className="eloria-button-secondary">
                <ShoppingBag className="size-4" />
                {successful
                  ? isPersian ? "بازگشت به فروشگاه" : "Back to shop"
                  : isPersian ? "بازگشت به تسویه‌حساب" : "Return to checkout"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </InternalPageShell>
  );
}
