import { CheckCircle2, Clock3, Package, Search, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { InternalPageShell } from "@/components/internal-page-shell";
import { LuxuryPageHero } from "@/components/luxury-page-hero";
import { formatAdminDate, formatAdminMoney, getOrderStatusLabel } from "@/lib/admin-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function mobile(value: string) { const fa="۰۱۲۳۴۵۶۷۸۹", ar="٠١٢٣٤٥٦٧٨٩"; return value.replace(/[۰-۹]/g,d=>String(fa.indexOf(d))).replace(/[٠-٩]/g,d=>String(ar.indexOf(d))).replace(/[^0-9+]/g,""); }

export default async function OrderTrackingPage({ params, searchParams }: { params: Promise<{locale: string}>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  const q = await searchParams;
  const orderNumber = one(q.orderNumber).trim().toUpperCase();
  const customerMobile = mobile(one(q.mobile));
  const searched = Boolean(orderNumber || customerMobile);
  const order = orderNumber && customerMobile ? await prisma.order.findFirst({
    where: { orderNumber, customerMobile },
    include: { items: { orderBy: { createdAt: "asc" } }, auditEvents: { orderBy: { createdAt: "desc" }, take: 50 } },
  }) : null;
  const shipmentEvent = order?.auditEvents.find(event => event.eventType === "SHIPMENT_DETAILS_UPDATED");
  const shipment = shipmentEvent?.payload && typeof shipmentEvent.payload === "object" && !Array.isArray(shipmentEvent.payload) ? shipmentEvent.payload as {carrier?: string; trackingCode?: string; note?: string} : undefined;
  const fa = locale === "fa";
  return <InternalPageShell locale={locale}>
    <section className="eloria-page-container relative z-10 pb-28 pt-36 sm:pt-40">
      <LuxuryPageHero
        eyebrow={fa ? "پیگیری سفارش" : "Order tracking"}
        title={fa ? "مسیر سفارش خود را ببینید" : "Track your order"}
        description={fa ? "شماره سفارش و موبایل ثبت‌شده هنگام خرید را وارد کنید." : "Enter your order number and checkout mobile."}
        isPersian={fa}
        icon={<Package className="size-7 text-[#e1c66d]" />}
      />
      <div className="mx-auto mt-10 max-w-5xl space-y-6">
        <form className="grid gap-3 rounded-[28px] border border-[#d6ba63]/18 bg-[#031a13]/88 p-5 shadow-[0_24px_70px_rgba(0,0,0,.24)] md:grid-cols-[1fr_1fr_auto]">
          <input className="h-12 rounded-xl border border-[#d0b359]/18 bg-[#02150f] px-4 text-sm text-[#f4e2b9] outline-none" defaultValue={orderNumber} dir="ltr" name="orderNumber" placeholder={fa ? "شماره سفارش" : "Order number"} required/>
          <input className="h-12 rounded-xl border border-[#d0b359]/18 bg-[#02150f] px-4 text-sm text-[#f4e2b9] outline-none" defaultValue={customerMobile} dir="ltr" name="mobile" placeholder={fa ? "شماره موبایل" : "Mobile"} required/>
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#a98a36,#e4c96f)] px-6 text-sm font-semibold text-[#10251c]"><Search className="size-4"/>{fa ? "پیگیری" : "Track"}</button>
        </form>
        {searched && !order ? <div className="rounded-2xl border border-amber-300/16 bg-amber-950/15 p-5 text-sm leading-7 text-amber-100">{fa ? "سفارشی با این شماره و موبایل پیدا نشد. اطلاعات را دقیقاً مطابق ثبت سفارش وارد کنید." : "No matching order was found."}</div> : null}
        {order ? <div className="space-y-5">
          <section className="grid gap-4 md:grid-cols-3"><article className="rounded-2xl border border-[#d0b359]/15 bg-[#041d15]/82 p-5"><Clock3 className="size-5 text-[#d8bd68]"/><p className="mt-3 text-xs text-[#91866f]">{fa ? "وضعیت" : "Status"}</p><p className="mt-1 font-semibold text-[#efd782]">{getOrderStatusLabel(order.status)}</p></article><article className="rounded-2xl border border-[#d0b359]/15 bg-[#041d15]/82 p-5"><Package className="size-5 text-[#d8bd68]"/><p className="mt-3 text-xs text-[#91866f]">{fa ? "شماره سفارش" : "Order"}</p><p className="mt-1 font-semibold text-[#efd782]">{order.orderNumber}</p></article><article className="rounded-2xl border border-[#d0b359]/15 bg-[#041d15]/82 p-5"><CheckCircle2 className="size-5 text-[#d8bd68]"/><p className="mt-3 text-xs text-[#91866f]">{fa ? "مبلغ" : "Amount"}</p><p className="mt-1 font-semibold text-[#efd782]">{formatAdminMoney(order.payableToman)}</p></article></section>
          {shipment ? <section className="rounded-2xl border border-[#d0b359]/15 bg-[#041d15]/82 p-5"><h2 className="flex items-center gap-2 font-semibold text-[#efd782]"><Truck className="size-5"/>{fa ? "اطلاعات ارسال" : "Shipment"}</h2><div className="mt-4 grid gap-3 text-sm text-[#c5b79a] sm:grid-cols-2"><p>{fa ? "روش ارسال" : "Carrier"}: {shipment.carrier || "—"}</p><p dir="ltr">{shipment.trackingCode || "—"}</p></div>{shipment.note ? <p className="mt-3 text-sm leading-7 text-[#9f9279]">{shipment.note}</p> : null}</section> : null}
          <section className="overflow-hidden rounded-2xl border border-[#d0b359]/15 bg-[#041d15]/82"><header className="border-b border-[#d0b359]/12 px-5 py-4"><h2 className="font-semibold text-[#efd782]">{fa ? "اقلام سفارش" : "Items"}</h2></header><div className="divide-y divide-[#d0b359]/10">{order.items.map(item => <div className="flex items-center justify-between gap-4 p-5" key={item.id}><div><p className="text-[#dfcfac]">{fa ? item.productNameFa : item.productNameEn}</p><p className="mt-1 text-xs text-[#857a66]">{item.quantity} × {formatAdminMoney(item.unitPriceToman)}</p></div><p className="text-[#efd27b]">{formatAdminMoney(item.lineTotalToman)}</p></div>)}</div></section>
          <p className="text-center text-xs text-[#817762]">{fa ? `آخرین به‌روزرسانی: ${formatAdminDate(order.updatedAt)}` : `Updated: ${formatAdminDate(order.updatedAt)}`}</p>
        </div> : null}
      </div>
    </section>
  </InternalPageShell>;
}
