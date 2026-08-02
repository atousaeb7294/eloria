import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CheckCircle2, CircleX, PackageSearch, ShoppingBag } from "lucide-react";

import { InternalPageShell } from "@/components/internal-page-shell";
import { LuxuryPageHero } from "@/components/luxury-page-hero";
import { OrderSuccessEffects } from "@/components/order-success-effects";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const requestedSuccess = status === "success";
  const query = await searchParams;
  const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const orderNumber = one(query.order).trim().toUpperCase();
  const referenceId = one(query.ref).trim();

  const verifiedOrder =
    requestedSuccess && orderNumber && referenceId
      ? await prisma.order.findFirst({
          where: {
            orderNumber,
            status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] },
            payments: {
              some: {
                provider: "ZARINPAL",
                status: "PAID",
                gatewayReference: referenceId,
              },
            },
          },
          select: { id: true },
        })
      : null;

  const successful = Boolean(verifiedOrder);

  const copy = successful
    ? isPersian
      ? {
          eyebrow: "Order Confirmed",
          title: "سفارش با موفقیت ثبت شد",
          description: "پرداخت سفارش در سمت سرور تأیید شد و موجودی این سفارش قطعی شده است.",
          note: "برای بررسی ادامه مسیر سفارش از صفحه پیگیری استفاده کنید.",
        }
      : {
          eyebrow: "Order Confirmed",
          title: "Your order was placed successfully",
          description: "The payment was verified on the server and this order has been confirmed.",
          note: "Use the tracking page to follow the next stages of your order.",
        }
    : isPersian
      ? {
          eyebrow: "Payment Interrupted",
          title: "ثبت سفارش کامل نشد",
          description: requestedSuccess
            ? "اطلاعات این رسید با پرداخت ثبت‌شده تطبیق ندارد. برای اطمینان، وضعیت سفارش را از صفحه پیگیری بررسی کنید."
            : "پرداخت یا تأیید سفارش کامل نشده است و مبلغی در این صفحه تأیید نمی‌شود.",
          note: "سبد خرید شما محفوظ می‌ماند و می‌توانید دوباره مسیر تسویه‌حساب را بررسی کنید.",
        }
      : {
          eyebrow: "Payment Interrupted",
          title: "The order was not completed",
          description: requestedSuccess
            ? "This receipt does not match a verified payment. Check the order through the tracking page."
            : "Payment or order confirmation was not completed, and this page confirms no charge.",
          note: "Your cart remains available so you can review checkout again.",
        };

  return (
    <InternalPageShell locale={locale}>
      {successful ? <OrderSuccessEffects /> : null}
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
