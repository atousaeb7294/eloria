import Link from "next/link";

import {
  Eye,
  Pencil,
  Plus,
  Search,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  formatAdminDate,
  formatAdminMoney,
  getProductStatusLabel,
} from "@/lib/admin-format";

import {
  prisma,
  withDatabaseRetry,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

type ProductStatusFilter =
  | "DRAFT"
  | "ACTIVE"
  | "OUT_OF_STOCK"
  | "ARCHIVED";

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

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    created?: string | string[];
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

  const allowedStatuses: ProductStatusFilter[] = [
    "DRAFT",
    "ACTIVE",
    "OUT_OF_STOCK",
    "ARCHIVED",
  ];

  const status =
    allowedStatuses.includes(
      rawStatus as ProductStatusFilter,
    )
      ? rawStatus as ProductStatusFilter
      : null;

  const products =
    await withDatabaseRetry(
      () =>
        prisma.product.findMany({
      where: {
        ...(status
          ? {
              status,
            }
          : {}),
        ...(search
          ? {
              OR: [
                {
                  nameFa: {
                    contains:
                      search,
                    mode:
                      "insensitive",
                  },
                },
                {
                  nameEn: {
                    contains:
                      search,
                    mode:
                      "insensitive",
                  },
                },
                {
                  slug: {
                    contains:
                      search,
                    mode:
                      "insensitive",
                  },
                },
                {
                  sku: {
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
      orderBy: [
        {
          displayOrder:
            "asc",
        },
        {
          updatedAt:
            "desc",
        },
      ],
      include: {
        collection: {
          select: {
            nameFa: true,
          },
        },
        images: {
          where: {
            isPrimary: true,
          },
          take: 1,
          select: {
            imageUrl: true,
          },
        },
        _count: {
          select: {
            variants: true,
          },
        },
      },
    }),
      {
        attempts: 2,
        delayMilliseconds: 200,
      },
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-[#b99e4f]">
            Catalog Management
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[#f7e4b6] sm:text-3xl">
            محصولات و موجودی
          </h1>
          <p className="mt-2 text-sm leading-7 text-[#9f9279]">
            ساخت، ویرایش، انتشار و کنترل موجودی آثار الوریا
          </p>
        </div>

        <Link
          href={`/${locale}/admin/products/new`}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#b9973f,#eed079)] px-5 text-sm font-semibold text-[#10251c] transition hover:brightness-105"
        >
          <Plus className="h-5 w-5" />
          محصول جدید
        </Link>
      </header>

      {singleValue(raw.created) === "1" ? (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-950/20 px-5 py-4 text-sm text-emerald-100">
          محصول جدید با موفقیت ساخته شد.
        </div>
      ) : null}

      <form className="grid gap-3 rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-4 md:grid-cols-[1fr_220px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#aa9451]" />
          <input
            defaultValue={search}
            name="q"
            placeholder="جست‌وجوی نام، SKU یا شناسه URL"
            className="h-12 w-full rounded-xl border border-[#d0b359]/18 bg-[#02150f] pr-11 pl-4 text-sm text-[#f4e2b9] outline-none placeholder:text-[#827763] focus:border-[#d8ba62]/55"
          />
        </label>

        <select
          defaultValue={status ?? ""}
          name="status"
          className="h-12 rounded-xl border border-[#d0b359]/18 bg-[#02150f] px-3 text-sm text-[#d5c5a2] outline-none focus:border-[#d8ba62]/55"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="ACTIVE">منتشرشده</option>
          <option value="DRAFT">پیش‌نویس</option>
          <option value="OUT_OF_STOCK">ناموجود</option>
          <option value="ARCHIVED">بایگانی‌شده</option>
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
            فهرست محصولات
          </h2>
          <span className="text-xs text-[#91866f]">
            {new Intl.NumberFormat("fa-IR").format(products.length)} نتیجه
          </span>
        </header>

        {products.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-right text-sm">
              <thead className="bg-black/10 text-[#9f9279]">
                <tr>
                  <th className="px-5 py-3 font-medium">محصول</th>
                  <th className="px-5 py-3 font-medium">گنجینه</th>
                  <th className="px-5 py-3 font-medium">جنس</th>
                  <th className="px-5 py-3 font-medium">موجودی</th>
                  <th className="px-5 py-3 font-medium">قیمت</th>
                  <th className="px-5 py-3 font-medium">وضعیت</th>
                  <th className="px-5 py-3 font-medium">آخرین ویرایش</th>
                  <th className="px-5 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0b359]/10">
                {products.map(
                  (product) => (
                    <tr
                      key={product.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#d0b359]/15 bg-[#02150f] text-xs text-[#8f846d]">
                            {product.images[0]?.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                alt={product.nameFa}
                                src={product.images[0].imageUrl}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "بدون عکس"
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[#ead9b3]">
                              {product.nameFa}
                            </p>
                            <p className="mt-1 text-xs text-[#857a66]">
                              {product.sku || product.slug} · {product._count.variants} تنوع
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#c2b397]">
                        {product.collection.nameFa}
                      </td>
                      <td className="px-5 py-4 text-[#c2b397]">
                        {product.material === "GOLD" ? "طلا" : "نقره"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={product.stock > 0 ? "text-emerald-200" : "text-orange-200"}>
                          {new Intl.NumberFormat("fa-IR").format(product.stock)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#dfcda5]">
                        {product.pricingMode === "MANUAL"
                          ? formatAdminMoney(product.price)
                          : "محاسبه پویا"}
                      </td>
                      <td className="px-5 py-4 text-[#c2b397]">
                        {getProductStatusLabel(product.status)}
                      </td>
                      <td className="px-5 py-4 text-xs text-[#857a66]">
                        {formatAdminDate(product.updatedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            aria-label="ویرایش محصول"
                            href={`/${locale}/admin/products/${product.id}`}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-[#d0b359]/18 bg-[#d0b258]/8 text-[#dec36c] hover:bg-[#d0b258]/14"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <Link
                            aria-label="مشاهده محصول"
                            href={`/${locale}/products/${product.slug}`}
                            target="_blank"
                            className="grid h-9 w-9 place-items-center rounded-lg border border-[#d0b359]/14 bg-white/[0.025] text-[#b8aa8e] hover:text-[#ecd17c]"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center px-5 text-center text-sm leading-8 text-[#91866f]">
            محصولی مطابق فیلتر فعلی پیدا نشد.
          </div>
        )}
      </section>
    </div>
  );
}
