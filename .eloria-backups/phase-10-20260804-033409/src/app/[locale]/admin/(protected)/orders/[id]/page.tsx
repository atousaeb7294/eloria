import Link from "next/link";

import {
  ArrowRight,
  Banknote,
  MapPin,
  Package,
  ReceiptText,
  UserRound,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import { AdminOrderWorkflow } from "@/components/admin/admin-order-workflow";

import {
  formatAdminDate,
  formatAdminMoney,
  getOrderStatusLabel,
} from "@/lib/admin-format";

import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

function JsonPreview({
  value,
}: {
  value: unknown;
}) {
  if (
    value === null ||
    value === undefined
  ) {
    return (
      <span className="text-[#7f7460]">
        بدون داده
      </span>
    );
  }

  let output = "";

  try {
    output =
      JSON.stringify(
        value,
        null,
        2,
      );
  } catch {
    output =
      String(value);
  }

  return (
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/20 p-3 text-left text-xs leading-6 text-[#b7aa90]" dir="ltr">
      {output}
    </pre>
  );
}

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {
    locale,
    id,
  } = await params;

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  const safeLocale: "fa" | "en" = locale;

  const order =
    await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        items: {
          orderBy: {
            createdAt:
              "asc",
          },
        },
        payments: {
          orderBy: {
            createdAt:
              "desc",
          },
        },
        auditEvents: {
          orderBy: {
            createdAt:
              "desc",
          },
          take: 100,
        },
      },
    });

  if (!order) {
    notFound();
  }

  const query = await searchParams;
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const decode = (value: string | string[] | undefined) => {
    const raw = one(value);
    if (!raw) return undefined;
    try { return decodeURIComponent(raw); } catch { return raw; }
  };
  const shipmentEvent = order.auditEvents.find((event) => event.eventType === "SHIPMENT_DETAILS_UPDATED");
  const latestShipment = shipmentEvent?.payload && typeof shipmentEvent.payload === "object" && !Array.isArray(shipmentEvent.payload)
    ? shipmentEvent.payload as { carrier?: string; trackingCode?: string; note?: string }
    : undefined;

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/${locale}/admin/orders`}
          className="inline-flex items-center gap-2 text-sm text-[#b9aa8c] hover:text-[#ecd17c]"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به سفارش‌ها
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#b99e4f]">
              ORDER {order.orderNumber}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#f7e4b6] sm:text-3xl">
              جزئیات سفارش
            </h1>
          </div>

          <span className="w-fit rounded-full border border-[#d5b75f]/20 bg-[#d0b258]/8 px-4 py-2 text-sm text-[#ebd17c]">
            {getOrderStatusLabel(order.status)}
          </span>
        </div>
      </header>

      <AdminOrderWorkflow
        orderId={order.id}
        locale={safeLocale}
        status={order.status}
        workflowSaved={one(query.workflowSaved) === "1"}
        workflowError={decode(query.workflowError)}
        shipmentSaved={one(query.shipmentSaved) === "1"}
        shipmentError={decode(query.shipmentError)}
        latestShipment={latestShipment}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5">
          <div className="flex items-center gap-3 text-[#d8bd68]">
            <UserRound className="h-5 w-5" />
            <h2 className="font-semibold">مشتری</h2>
          </div>
          <div className="mt-4 space-y-2 text-sm leading-7 text-[#b8aa8e]">
            <p>{order.customerFullName || "نام ثبت نشده"}</p>
            <p dir="ltr" className="text-right">{order.customerMobile || "—"}</p>
            <p className="break-all">{order.customerEmail || "—"}</p>
          </div>
        </article>

        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5">
          <div className="flex items-center gap-3 text-[#d8bd68]">
            <MapPin className="h-5 w-5" />
            <h2 className="font-semibold">نشانی</h2>
          </div>
          <div className="mt-4 text-sm leading-7 text-[#b8aa8e]">
            <p>{[order.province, order.city].filter(Boolean).join("، ") || "—"}</p>
            <p>{order.address || "نشانی ثبت نشده"}</p>
            <p>کدپستی: {order.postalCode || "—"}</p>
          </div>
        </article>

        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5">
          <div className="flex items-center gap-3 text-[#d8bd68]">
            <Banknote className="h-5 w-5" />
            <h2 className="font-semibold">مبالغ</h2>
          </div>
          <div className="mt-4 space-y-2 text-sm leading-7 text-[#b8aa8e]">
            <div className="flex justify-between gap-3"><span>جمع اقلام</span><span>{formatAdminMoney(order.subtotalToman)}</span></div>
            <div className="flex justify-between gap-3"><span>ارسال</span><span>{formatAdminMoney(order.shippingToman)}</span></div>
            <div className="flex justify-between gap-3"><span>تخفیف</span><span>{formatAdminMoney(order.discountToman)}</span></div>
            <div className="flex justify-between gap-3 border-t border-[#d0b359]/12 pt-2 font-semibold text-[#efd27b]"><span>قابل پرداخت</span><span>{formatAdminMoney(order.payableToman)}</span></div>
          </div>
        </article>

        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5">
          <div className="flex items-center gap-3 text-[#d8bd68]">
            <ReceiptText className="h-5 w-5" />
            <h2 className="font-semibold">زمان‌بندی</h2>
          </div>
          <div className="mt-4 space-y-2 text-sm leading-7 text-[#b8aa8e]">
            <p>ثبت: {formatAdminDate(order.createdAt)}</p>
            <p>انقضای قیمت: {formatAdminDate(order.priceExpiresAt)}</p>
            <p>پرداخت: {formatAdminDate(order.paidAt)}</p>
            <p>ارسال/تکمیل: {formatAdminDate(order.inventoryCommittedAt)}</p>
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82">
        <header className="flex items-center gap-3 border-b border-[#d0b359]/12 px-5 py-4">
          <Package className="h-5 w-5 text-[#d8bd68]" />
          <h2 className="font-semibold text-[#efd782]">
            اقلام سفارش
          </h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-right text-sm">
            <thead className="bg-black/10 text-[#9f9279]">
              <tr>
                <th className="px-5 py-3 font-medium">محصول</th>
                <th className="px-5 py-3 font-medium">تنوع</th>
                <th className="px-5 py-3 font-medium">جنس</th>
                <th className="px-5 py-3 font-medium">تعداد</th>
                <th className="px-5 py-3 font-medium">قیمت واحد</th>
                <th className="px-5 py-3 font-medium">جمع</th>
                <th className="px-5 py-3 font-medium">موجودی رزرو</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0b359]/10">
              {order.items.map(
                (item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4">
                      <p className="text-[#dfcfac]">{item.productNameFa}</p>
                      <p className="mt-1 text-xs text-[#857a66]">{item.productSku || item.productSlug}</p>
                    </td>
                    <td className="px-5 py-4 text-[#b8aa8e]">
                      {item.variantTitleFa || "—"}
                    </td>
                    <td className="px-5 py-4 text-[#b8aa8e]">
                      {item.material === "GOLD" ? "طلا" : "نقره"}
                    </td>
                    <td className="px-5 py-4 text-[#dfcfac]">
                      {new Intl.NumberFormat("fa-IR").format(item.quantity)}
                    </td>
                    <td className="px-5 py-4 text-[#dfcfac]">
                      {formatAdminMoney(item.unitPriceToman)}
                    </td>
                    <td className="px-5 py-4 font-medium text-[#efd27b]">
                      {formatAdminMoney(item.lineTotalToman)}
                    </td>
                    <td className="px-5 py-4 text-[#a99c82]">
                      {new Intl.NumberFormat("fa-IR").format(item.stockBeforeReservation)} → {new Intl.NumberFormat("fa-IR").format(item.stockAfterReservation)}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="overflow-hidden rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82">
          <header className="border-b border-[#d0b359]/12 px-5 py-4">
            <h2 className="font-semibold text-[#efd782]">تلاش‌های پرداخت</h2>
          </header>

          {order.payments.length ? (
            <div className="divide-y divide-[#d0b359]/10">
              {order.payments.map(
                (payment) => (
                  <div key={payment.id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[#dfcfac]">{payment.provider}</p>
                        <p className="mt-1 text-xs text-[#857a66]">{formatAdminDate(payment.createdAt)}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-[#efd27b]">{formatAdminMoney(payment.amountToman)}</p>
                        <p className="mt-1 text-xs text-[#a99c82]">{payment.status}</p>
                      </div>
                    </div>
                    {payment.errorMessage ? (
                      <p className="mt-3 rounded-xl bg-red-950/20 px-3 py-2 text-xs leading-6 text-red-100/80">
                        {payment.errorCode ? `${payment.errorCode}: ` : ""}{payment.errorMessage}
                      </p>
                    ) : null}
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="grid min-h-36 place-items-center px-5 text-sm text-[#91866f]">
              تلاش پرداختی ثبت نشده است.
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82">
          <header className="border-b border-[#d0b359]/12 px-5 py-4">
            <h2 className="font-semibold text-[#efd782]">تاریخچه سیستمی</h2>
          </header>

          {order.auditEvents.length ? (
            <div className="max-h-[520px] divide-y divide-[#d0b359]/10 overflow-auto">
              {order.auditEvents.map(
                (event) => (
                  <details key={event.id} className="group p-5">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#dfcfac]">{event.eventType}</p>
                          <p className="mt-1 text-xs text-[#857a66]">{event.actorType} · {formatAdminDate(event.createdAt)}</p>
                        </div>
                        <span className="text-xs text-[#8f846d] group-open:text-[#d9bd68]">نمایش داده</span>
                      </div>
                    </summary>
                    <div className="mt-4">
                      <JsonPreview value={event.payload} />
                    </div>
                  </details>
                ),
              )}
            </div>
          ) : (
            <div className="grid min-h-36 place-items-center px-5 text-sm text-[#91866f]">
              رویداد سیستمی ثبت نشده است.
            </div>
          )}
        </article>
      </section>

      <details className="rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5">
        <summary className="cursor-pointer font-semibold text-[#efd782]">
          Snapshot قیمت‌گذاری سفارش
        </summary>
        <div className="mt-4">
          <JsonPreview value={order.pricingSnapshot} />
        </div>
      </details>
    </div>
  );
}
