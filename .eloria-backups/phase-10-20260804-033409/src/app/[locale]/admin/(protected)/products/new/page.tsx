import Link from "next/link";

import {
  ArrowRight,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  AdminProductForm,
  type AdminProductFormValue,
} from "@/components/admin/admin-product-form";

import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

export default async function NewAdminProductPage({
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

  const collections =
    await prisma.collection.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        displayOrder:
          "asc",
      },
      select: {
        id: true,
        nameFa: true,
        slug: true,
      },
    });

  const initialValue: AdminProductFormValue = {
    collectionId:
      collections[0]?.id ?? "",
    slug: "",
    sku: "",
    nameFa: "",
    nameEn: "",
    descriptionFa: "",
    descriptionEn: "",
    legendFa: "",
    legendEn: "",
    material: "GOLD",
    pricingMode: "DYNAMIC",
    price: "",
    compareAtPrice: "",
    metalWeight: "",
    purity: "18K",
    purityFineness: "750",
    makingChargeType: "NONE",
    makingChargeFixed: "0",
    makingChargePerGram: "0",
    makingChargePercent: "0",
    artisticFee: "0",
    profitPercent: "",
    taxPercent: "",
    stock: "0",
    status: "DRAFT",
    isFeatured: false,
    displayOrder: "0",
    primaryImageUrl: "",
  };

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/${locale}/admin/products`}
          className="inline-flex items-center gap-2 text-sm text-[#b9aa8c] hover:text-[#ecd17c]"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به محصولات
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-[#f7e4b6] sm:text-3xl">
          ساخت محصول جدید
        </h1>
        <p className="mt-2 text-sm leading-7 text-[#9f9279]">
          محصول ابتدا می‌تواند به‌صورت پیش‌نویس ذخیره و پس از تکمیل منتشر شود.
        </p>
      </header>

      {!collections.length ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-950/20 px-5 py-4 text-sm leading-7 text-amber-100">
          برای ساخت محصول باید حداقل یک گنجینه فعال در دیتابیس وجود داشته باشد.
        </div>
      ) : (
        <AdminProductForm
          locale={locale}
          collections={collections}
          value={initialValue}
        />
      )}
    </div>
  );
}
