import Link from "next/link";

import {
  Boxes,
  CircleDollarSign,
  Clock3,
  Bot,
  PackageCheck,
  Plus,
  ShoppingBag,
  TriangleAlert,
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

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{
    locale: string;
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

  const startOfToday =
    new Date();

  startOfToday.setHours(
    0,
    0,
    0,
    0,
  );

  const [
    activeProducts,
    draftProducts,
    outOfStockProducts,
    pendingOrders,
    todayOrders,
    recentOrders,
    metalPrices,
    todaySales,
    paymentReview,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        status: "ACTIVE",
      },
    }),
    prisma.product.count({
      where: {
        status: "DRAFT",
      },
    }),
    prisma.product.count({
      where: {
        OR: [
          {
            status:
              "OUT_OF_STOCK",
          },
          {
            stock: {
              lte: 0,
            },
          },
        ],
      },
    }),
    prisma.order.count({
      where: {
        status: {
          in: [
            "PENDING_PAYMENT",
            "PAID",
            "PROCESSING",
          ],
        },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: {
          gte:
            startOfToday,
        },
      },
    }),
    prisma.order.findMany({
      take: 6,
      orderBy: {
        createdAt:
          "desc",
      },
      select: {
        id: true,
        orderNumber: true,
        customerFullName: true,
        customerMobile: true,
        status: true,
        payableToman: true,
        createdAt: true,
      },
    }),
    prisma.metalPrice.findMany({
      orderBy: {
        material:
          "asc",
      },
      select: {
        material: true,
        pricePerGram: true,
        source: true,
        lastSuccessAt: true,
      },
    }),
    prisma.order.aggregate({
      where: {
        status: {
          in: [
            "PAID",
            "PROCESSING",
            "SHIPPED",
            "COMPLETED",
          ],
        },
        paidAt: {
          gte: startOfToday,
        },
      },
      _sum: {
        payableToman: true,
      },
    }),
    prisma.paymentAttempt.count({
      where: {
        status: "REQUIRES_REVIEW",
      },
    }),
  ]);

  const stats = [
    {
      label:
        "محصول منتشرشده",
      value:
        activeProducts,
      icon:
        PackageCheck,
      tone:
        "text-emerald-200",
    },
    {
      label:
        "پیش‌نویس‌ها",
      value:
        draftProducts,
      icon:
        Boxes,
      tone:
        "text-[#efd37c]",
    },
    {
      label:
        "نیازمند موجودی",
      value:
        outOfStockProducts,
      icon:
        TriangleAlert,
      tone:
        "text-orange-200",
    },
    {
      label:
        "سفارش‌های باز",
      value:
        pendingOrders,
      icon:
        ShoppingBag,
      tone:
        "text-sky-200",
    },
    {
      label:
        "فروش امروز",
      value:
        formatAdminMoney(
          todaySales._sum.payableToman ?? 0,
        ),
      icon:
        CircleDollarSign,
      tone:
        "text-[#efd37c]",
    },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-[#b99e4f]">
            نمای عملیاتی
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[#f7e4b6] sm:text-3xl">
            داشبورد مدیریت الوریا
          </h1>
          <p className="mt-2 text-sm leading-7 text-[#9f9279]">
            وضعیت محصولات، موجودی، سفارش‌ها و آخرین نرخ‌های ثبت‌شده
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/automation`}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#d0b359]/22 bg-[#08251a] px-4 text-sm text-[#ecd17c] transition hover:bg-[#103525]"
          >
            <Bot className="h-5 w-5" />
            خلبان خودکار
          </Link>
          <Link
            href={`/${locale}/admin/products/new`}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#b9973f,#eed079)] px-5 text-sm font-semibold text-[#10251c] transition hover:brightness-105"
          >
            <Plus className="h-5 w-5" />
            محصول جدید
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(
          ({
            label,
            value,
            icon: Icon,
            tone,
          }) => (
            <article
              key={label}
              className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.17)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#a99c82]">
                    {label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-[#f5e4bb]">
                    {typeof value === "number"
                      ? new Intl.NumberFormat("fa-IR").format(value)
                      : value}
                  </p>
                </div>
                <span className={`grid h-11 w-11 place-items-center rounded-xl border border-white/8 bg-white/4 ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </article>
          ),
        )}
      </section>

      {paymentReview > 0 ? (
        <Link
          href={`/${locale}/admin/orders`}
          className="flex items-center justify-between gap-4 rounded-2xl border border-amber-300/18 bg-amber-950/12 px-5 py-4 text-sm text-amber-100 transition hover:bg-amber-950/20"
        >
          <span>
            {new Intl.NumberFormat("fa-IR").format(paymentReview)} پرداخت نیازمند بررسی انسانی دارد؛ هیچ پرداختی خودکار تأیید نمی‌شود.
          </span>
          <span className="shrink-0 text-xs">بررسی سفارش‌ها</span>
        </Link>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="overflow-hidden rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82">
          <header className="flex items-center justify-between border-b border-[#d0b359]/12 px-5 py-4">
            <div>
              <h2 className="font-semibold text-[#efd782]">
                آخرین سفارش‌ها
              </h2>
              <p className="mt-1 text-xs text-[#8f846d]">
                امروز {new Intl.NumberFormat("fa-IR").format(todayOrders)} سفارش ثبت شده است
              </p>
            </div>
            <Link
              href={`/${locale}/admin/orders`}
              className="text-sm text-[#d7bb67] hover:text-[#f1d985]"
            >
              مشاهده همه
            </Link>
          </header>

          {recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-right text-sm">
                <thead className="bg-black/10 text-[#9f9279]">
                  <tr>
                    <th className="px-5 py-3 font-medium">شماره</th>
                    <th className="px-5 py-3 font-medium">مشتری</th>
                    <th className="px-5 py-3 font-medium">وضعیت</th>
                    <th className="px-5 py-3 font-medium">مبلغ</th>
                    <th className="px-5 py-3 font-medium">زمان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0b359]/10">
                  {recentOrders.map(
                    (order) => (
                      <tr
                        key={order.id}
                        className="transition hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/${locale}/admin/orders/${order.id}`}
                            className="font-medium text-[#ecd17c] hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-[#d5c6a6]">
                          {order.customerFullName || order.customerMobile || "—"}
                        </td>
                        <td className="px-5 py-4 text-[#b8aa8d]">
                          {getOrderStatusLabel(order.status)}
                        </td>
                        <td className="px-5 py-4 text-[#e4d2aa]">
                          {formatAdminMoney(order.payableToman)}
                        </td>
                        <td className="px-5 py-4 text-xs text-[#8f846d]">
                          {formatAdminDate(order.createdAt)}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center px-5 text-center text-sm text-[#91866f]">
              هنوز سفارشی ثبت نشده است.
            </div>
          )}
        </article>

        <article className="rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#d1b45d]/20 bg-[#d0b258]/8 text-[#e1c56f]">
              <CircleDollarSign className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-[#efd782]">
                نرخ فلزات
              </h2>
              <p className="mt-1 text-xs text-[#8f846d]">
                آخرین مقدار ذخیره‌شده در دیتابیس
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {metalPrices.length ? (
              metalPrices.map(
                (price) => (
                  <div
                    key={price.material}
                    className="rounded-2xl border border-[#d0b359]/12 bg-[#02150f] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[#d8c8a7]">
                        {price.material === "GOLD"
                          ? "طلای مرجع"
                          : "نقره مرجع"}
                      </span>
                      <span className="text-sm font-semibold text-[#f0d47d]">
                        {formatAdminMoney(price.pricePerGram)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#887d68]">
                      <span>{price.source || "منبع نامشخص"}</span>
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatAdminDate(price.lastSuccessAt)}
                      </span>
                    </div>
                  </div>
                ),
              )
            ) : (
              <p className="rounded-2xl border border-dashed border-[#d0b359]/16 px-4 py-8 text-center text-sm leading-7 text-[#8f846d]">
                هنوز نرخ فلزی در دیتابیس ثبت نشده است.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
