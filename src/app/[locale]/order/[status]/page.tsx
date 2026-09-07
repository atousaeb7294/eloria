import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CheckCircle2, CircleAlert, CircleX, PackageSearch, ShoppingBag } from "lucide-react";
import { InternalPageShell } from "@/components/internal-page-shell";
import { LuxuryPageHero } from "@/components/luxury-page-hero";
import { OrderSuccessEffects } from "@/components/order-success-effects";
import { verifyPaymentReceiptToken } from "@/lib/payment-receipt-token";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const statuses = ["success", "review", "failed"] as const;
type Status = (typeof statuses)[number];

type OrderResultPageProps = {
  params: Promise<{ locale: string; status: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return statuses.map(status => ({ status }));
}

export default async function OrderResultPage({ params, searchParams }: OrderResultPageProps) {
  const { locale, status } = await params;
  if ((locale !== "fa" && locale !== "en") || !statuses.includes(status as Status)) notFound();
  setRequestLocale(locale);
  const isPersian = locale === "fa";
  const query = await searchParams;
  const value = query.receipt;
  const receiptToken = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const receipt = receiptToken ? verifyPaymentReceiptToken(receiptToken) : null;

  const order = receipt
    ? await prisma.order.findFirst({
        where: {
          id: receipt.orderId,
          payments: { some: { id: receipt.attemptId } },
        },
        include: {
          payments: { where: { id: receipt.attemptId }, take: 1 },
        },
      })
    : null;
  const attempt = order?.payments[0];
  const successful =
    status === "success" &&
    receipt?.outcome === "success" &&
    ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(order?.status ?? "") &&
    attempt?.status === "PAID";
  const reviewing =
    status === "review" &&
    receipt?.outcome === "review" &&
    Boolean(order) &&
    attempt?.status === "REQUIRES_REVIEW";

  const copy = successful
    ? isPersian
      ? { eyebrow: "Order Confirmed", title: "سفارش با موفقیت ثبت شد", description: "پرداخت در سمت سرور تأیید و موجودی سفارش قطعی شده است.", note: "برای ادامه مسیر سفارش از صفحه پیگیری استفاده کنید." }
      : { eyebrow: "Order Confirmed", title: "Your order was placed successfully", description: "The payment was verified and inventory was committed.", note: "Use order tracking for the next stages." }
    : reviewing
      ? isPersian
        ? { eyebrow: "Payment Received", title: "پرداخت دریافت شد و در حال بررسی است", description: "پرداخت بانکی تأیید شده، اما موجودی سفارش نیازمند بررسی پشتیبانی است.", note: "هیچ پرداخت دوباره‌ای انجام ندهید. نتیجه بررسی از طریق پشتیبانی و پیامک اعلام می‌شود." }
        : { eyebrow: "Payment Received", title: "Your payment requires review", description: "The bank payment was verified, but inventory needs manual review.", note: "Do not pay again. Support will contact you." }
      : isPersian
        ? { eyebrow: "Payment Interrupted", title: "ثبت سفارش کامل نشد", description: "این صفحه رسید معتبر و تأییدشده‌ای دریافت نکرده است.", note: "وضعیت سفارش را از صفحه پیگیری بررسی کنید." }
        : { eyebrow: "Payment Interrupted", title: "The order was not completed", description: "This page did not receive a valid verified receipt.", note: "Check the order through the tracking page." };

  const icon = successful
    ? <CheckCircle2 className="size-7 text-emerald-200" />
    : reviewing
      ? <CircleAlert className="size-7 text-amber-200" />
      : <CircleX className="size-7 text-rose-200" />;

  return (
    <InternalPageShell locale={locale}>
      {successful ? <OrderSuccessEffects /> : null}
      <section className="eloria-page-container relative z-10 flex min-h-[78vh] items-center pb-24 pt-36 sm:pt-40">
        <div className="w-full">
          <LuxuryPageHero eyebrow={copy.eyebrow} title={copy.title} description={copy.description} isPersian={isPersian} icon={icon} />
          <div data-reveal className="eloria-panel mx-auto mt-10 max-w-3xl rounded-[2.2rem] p-6 text-center sm:p-9">
            <p className="text-sm leading-8 text-[#d6c8a8]/70">{copy.note}</p>
            {order ? <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#d9b85f]/18 bg-black/10 p-4 text-sm text-[#e8d7af]">
              <div className="flex justify-between gap-4"><span>{isPersian ? "شماره سفارش" : "Order number"}</span><span dir="ltr" className="text-[#efd985]">{order.orderNumber}</span></div>
              {attempt?.gatewayReference ? <div className="mt-3 flex justify-between gap-4"><span>{isPersian ? "کد پیگیری پرداخت" : "Payment reference"}</span><span dir="ltr" className="text-[#efd985]">{attempt.gatewayReference}</span></div> : null}
            </div> : null}
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={`/${locale}/order-tracking`} className="eloria-button-primary"><PackageSearch className="size-4" />{isPersian ? "پیگیری سفارش" : "Track order"}</Link>
              <Link href={successful || reviewing ? `/${locale}/products` : `/${locale}/checkout`} className="eloria-button-secondary"><ShoppingBag className="size-4" />{successful || reviewing ? (isPersian ? "بازگشت به فروشگاه" : "Back to shop") : (isPersian ? "بازگشت به تسویه‌حساب" : "Return to checkout")}</Link>
            </div>
          </div>
        </div>
      </section>
    </InternalPageShell>
  );
}
