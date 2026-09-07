import Link from "next/link";

import {
  Eye,
  Search,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

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

type OrderStatusFilter =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REVIEW"
  | "PAYMENT_ATTEMPT_REVIEW"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

function singleValue(
  value:
    | string
    | string[]
    | undefined,
): string {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
  }>;
}) {
  const {
    locale,
  } = await params;

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  const raw =
    await searchParams;

  const search =
    singleValue(raw.q).trim();

  const rawStatus =
    singleValue(raw.status);

  const allowedStatuses: OrderStatusFilter[] = [
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "COMPLETED",
    "PAYMENT_FAILED",
    "PAYMENT_REVIEW",
    "PAYMENT_ATTEMPT_REVIEW",
    "CANCELLED",
    "EXPIRED",
    "REFUNDED",
  ];

  const status =
    allowedStatuses.includes(
      rawStatus as OrderStatusFilter,
    )
      ? rawStatus as OrderStatusFilter
      : null;

  const orders =
    await prisma.order.findMany({
      where: {
        ...(status === "PAYMENT_ATTEMPT_REVIEW"
          ? { payments: { some: { status: "REQUIRES_REVIEW" } } }
          : status
            ? { status }
            : {}),
        ...(search
          ? {
              OR: [
                {
                  orderNumber: {
                    contains:
                      search,
                    mode:
                      "insensitive",
                  },
                },
                {
                  customerFullName: {
                    contains:
                      search,
                    mode:
                      "insensitive",
                  },
                },
                {
                  customerMobile: {
                    contains:
                      search,
                  },
                },
                {
                  customerEmail: {
                    contains:
                      search,
                    mode:
                      "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt:
          "desc",
      },
      take: 250,
      include: {
        _count: {
          select: {
            items: true,
            payments: true,
          },
        },
        payments: {
          where: { status: "REQUIRES_REVIEW" },
          select: { id: true },
        },
      },
    });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs tracking-[0.25em] text-[#b99e4f]">
          Order Operations
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#f7e4b6] sm:text-3xl">
          سفارش‌ها
        </h1>
        <p className="mt-2 text-sm leading-7 text-[#9f9279]">
          مشاهده اطلاعات مشتری، اقلام، پرداخت‌ها و تاریخچه هر سفارش
        </p>
      </header>

      <form className="grid gap-3 rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-4 md:grid-cols-[1fr_240px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#aa9451]" />
          <input
            defaultValue={search}
            name="q"
            placeholder="شماره سفارش، نام، موبایل یا ایمیل"
            className="h-12 w-full rounded-xl border border-[#d0b359]/18 bg-[#02150f] pr-11 pl-4 text-sm text-[#f4e2b9] outline-none placeholder:text-[#827763] focus:border-[#d8ba62]/55"
          />
        </label>

        <select
          defaultValue={status ?? ""}
          name="status"
          className="h-12 rounded-xl border border-[#d0b359]/18 bg-[#02150f] px-3 text-sm text-[#d5c5a2] outline-none focus:border-[#d8ba62]/55"
        >
          <option value="">همه وضعیت‌ها</option>
          {allowedStatuses.map(
            (orderStatus) => (
              <option
                key={orderStatus}
                value={orderStatus}
              >
                {orderStatus === "PAYMENT_ATTEMPT_REVIEW"
                  ? "پرداخت اضافه/نیازمند بازپرداخت"
                  : getOrderStatusLabel(orderStatus)}
              </option>
            ),
          )}
        </select>

        <button
          type="submit"
          className="h-12 rounded-xl border border-[#d6b95f]/25 bg-[#d0b258]/10 px-5 text-sm text-[#ead17d] hover:bg-[#d0b258]/15"
        >
          اعمال فیلتر
        </button>
      </form>

      <section className="overflow-hidden rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82">
        <header className="flex items-center justify-between border-b border-[#d0b359]/12 px-5 py-4">
          <h2 className="font-semibold text-[#efd782]">
            فهرست سفارش‌ها
          </h2>
          <span className="text-xs text-[#91866f]">
            {new Intl.NumberFormat("fa-IR").format(orders.length)} نتیجه
          </span>
        </header>

        {orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-right text-sm">
              <thead className="bg-black/10 text-[#9f9279]">
                <tr>
                  <th className="px-5 py-3 font-medium">شماره سفارش</th>
                  <th className="px-5 py-3 font-medium">مشتری</th>
                  <th className="px-5 py-3 font-medium">تماس</th>
                  <th className="px-5 py-3 font-medium">اقلام</th>
                  <th className="px-5 py-3 font-medium">مبلغ</th>
                  <th className="px-5 py-3 font-medium">وضعیت</th>
                  <th className="px-5 py-3 font-medium">زمان ثبت</th>
                  <th className="px-5 py-3 font-medium">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0b359]/10">
                {orders.map(
                  (order) => (
                    <tr
                      key={order.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4 font-medium text-[#ecd17c]">
                        {order.orderNumber}
                      </td>
                      <td className="px-5 py-4 text-[#d5c6a6]">
                        {order.customerFullName || "—"}
                      </td>
                      <td className="px-5 py-4 text-[#aa9d83]">
                        <div>{order.customerMobile || "—"}</div>
                        <div className="mt-1 text-xs">{order.customerEmail || ""}</div>
                      </td>
                      <td className="px-5 py-4 text-[#d5c6a6]">
                        {new Intl.NumberFormat("fa-IR").format(order._count.items)}
                      </td>
                      <td className="px-5 py-4 text-[#dfcda5]">
                        {formatAdminMoney(order.payableToman)}
                      </td>
                      <td className="px-5 py-4 text-[#c2b397]">
                        <div>{getOrderStatusLabel(order.status)}</div>
                        {order.payments.length ? (
                          <div className="mt-1 text-xs text-amber-200">
                            پرداخت نیازمند بازپرداخت: {new Intl.NumberFormat("fa-IR").format(order.payments.length)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-xs text-[#857a66]">
                        {formatAdminDate(order.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          aria-label="مشاهده جزئیات سفارش"
                          href={`/${locale}/admin/orders/${order.id}`}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#d0b359]/18 bg-[#d0b258]/8 text-[#dec36c] hover:bg-[#d0b258]/14"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center px-5 text-center text-sm leading-8 text-[#91866f]">
            سفارشی مطابق فیلتر فعلی پیدا نشد.
          </div>
        )}
      </section>
    </div>
  );
}
