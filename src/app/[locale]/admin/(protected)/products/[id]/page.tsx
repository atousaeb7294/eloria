import Link from "next/link";

import {
  ArrowRight,
  ExternalLink,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  AdminProductDangerZone,
} from "@/components/admin/admin-product-danger-zone";

import {
  AdminProductForm,
  type AdminProductFormValue,
} from "@/components/admin/admin-product-form";

import {
  AdminProductMediaManager,
} from "@/components/admin/admin-product-media-manager";

import {
  AdminProductVariantManager,
} from "@/components/admin/admin-product-variant-manager";

import {
  prisma,
  withDatabaseRetry,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

function one(
  value: string | string[] | undefined,
): string {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

function decoded(
  value: string | string[] | undefined,
): string | undefined {
  const raw = one(value);

  if (!raw) {
    return undefined;
  }

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default async function EditAdminProductPage({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string;
    id: string;
  }>;
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
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

  const safeLocale: "fa" | "en" =
    locale;

  const product =
    await withDatabaseRetry(
      () =>
        prisma.product.findUnique({
          where: {
            id,
          },
          include: {
            images: {
              orderBy: [
                {
                  isPrimary: "desc",
                },
                {
                  displayOrder: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
            },
            variants: {
              orderBy: [
                {
                  displayOrder: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
            },
            _count: {
              select: {
                orderItems: true,
              },
            },
          },
        }),
      {
        attempts: 2,
        delayMilliseconds: 200,
      },
    );

  if (!product) {
    notFound();
  }

  const collections =
    await withDatabaseRetry(
      () =>
        prisma.collection.findMany({
          where: {
            isActive: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
          select: {
            id: true,
            nameFa: true,
            slug: true,
          },
        }),
      {
        attempts: 2,
        delayMilliseconds: 200,
      },
    );

  const query =
    await searchParams;

  const value: AdminProductFormValue = {
    id: product.id,
    collectionId: product.collectionId,
    slug: product.slug,
    sku: product.sku ?? "",
    nameFa: product.nameFa,
    nameEn: product.nameEn,
    descriptionFa: product.descriptionFa ?? "",
    descriptionEn: product.descriptionEn ?? "",
    legendFa: product.legendFa ?? "",
    legendEn: product.legendEn ?? "",
    material: product.material,
    pricingMode: product.pricingMode,
    price: product.price?.toString() ?? "",
    compareAtPrice:
      product.compareAtPrice?.toString() ?? "",
    metalWeight:
      product.metalWeight?.toString() ?? "",
    purity: product.purity ?? "",
    purityFineness:
      product.purityFineness?.toString() ?? "",
    makingChargeType:
      product.makingChargeType,
    makingChargeFixed:
      product.makingChargeFixed.toString(),
    makingChargePerGram:
      product.makingChargePerGram.toString(),
    makingChargePercent:
      product.makingChargePercent.toString(),
    artisticFee:
      product.artisticFee.toString(),
    profitPercent:
      product.profitPercent?.toString() ?? "",
    taxPercent:
      product.taxPercent?.toString() ?? "",
    stock: product.stock.toString(),
    status: product.status,
    isFeatured: product.isFeatured,
    displayOrder:
      product.displayOrder.toString(),
    primaryImageUrl:
      product.images.find(
        image => image.isPrimary,
      )?.imageUrl ??
      product.images[0]?.imageUrl ??
      "",
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={`/${locale}/admin/products`}
            className="inline-flex items-center gap-2 text-sm text-[#b9aa8c] hover:text-[#ecd17c]"
          >
            <ArrowRight className="size-4" />
            بازگشت به محصولات
          </Link>

          <h1 className="mt-4 text-2xl font-semibold text-[#f7e4b6] sm:text-3xl">
            ویرایش {product.nameFa}
          </h1>

          <p className="mt-2 text-sm text-[#9f9279]">
            اطلاعات، گالری و تنوع‌های محصول از همین صفحه مدیریت می‌شوند.
          </p>
        </div>

        <Link
          href={`/${locale}/products/${product.slug}`}
          target="_blank"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d1b45c]/20 bg-[#d0b258]/8 px-4 text-sm text-[#dfc46e]"
        >
          <ExternalLink className="size-4" />
          پیش‌نمایش محصول
        </Link>
      </header>

      {one(query.saved) === "1" ? (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-950/20 p-4 text-sm text-emerald-100">
          اطلاعات محصول ذخیره شد.
        </div>
      ) : null}

      <AdminProductForm
        locale={safeLocale}
        collections={collections}
        value={value}
      />

      <AdminProductMediaManager
        productId={product.id}
        locale={safeLocale}
        images={product.images}
        saved={one(query.mediaSaved) === "1"}
        error={decoded(query.mediaError)}
      />

      <AdminProductVariantManager
        productId={product.id}
        locale={safeLocale}
        variants={product.variants}
        saved={one(query.variantSaved) === "1"}
        archived={one(query.variantArchived) === "1"}
        error={decoded(query.variantError)}
      />

      <AdminProductDangerZone
        productId={product.id}
        locale={safeLocale}
        hasOrders={
          product._count.orderItems > 0
        }
      />
    </div>
  );
}
