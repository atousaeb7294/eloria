"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  hasValidAdminSession,
} from "@/lib/admin-auth";

import {
  prisma,
  withDatabaseRetry,
} from "@/lib/prisma";

export type AdminProductActionState = {
  error: string | null;
};

class AdminProductActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminProductActionError";
  }
}

function publicAdminProductError(
  error: unknown,
  fallback: string,
  operation: "create" | "update",
): string {
  if (error instanceof AdminProductActionError) {
    return error.message;
  }
  console.error(`[Eloria Admin Product] Unexpected ${operation} error.`, error);
  return fallback;
}

type ParsedProductInput = {
  locale: "fa" | "en";
  collectionId: string;
  slug: string;
  sku: string | null;
  nameFa: string;
  nameEn: string;
  descriptionFa: string | null;
  descriptionEn: string | null;
  legendFa: string | null;
  legendEn: string | null;
  material: "GOLD" | "SILVER";
  pricingMode: "DYNAMIC" | "MANUAL";
  price: string | null;
  compareAtPrice: string | null;
  metalWeight: string | null;
  purity: string | null;
  purityFineness: number | null;
  makingChargeType:
    | "NONE"
    | "FIXED"
    | "PER_GRAM"
    | "PERCENT"
    | "COMBINED";
  makingChargeFixed: string;
  makingChargePerGram: string;
  makingChargePercent: string;
  artisticFee: string;
  profitPercent: string | null;
  taxPercent: string | null;
  stock: number;
  status:
    | "DRAFT"
    | "ACTIVE"
    | "OUT_OF_STOCK"
    | "ARCHIVED";
  isFeatured: boolean;
  displayOrder: number;
  primaryImageUrl: string | null;
};

function readText(
  formData: FormData,
  key: string,
  maximumLength: number,
  required = false,
): string | null {
  const value =
    formData.get(key);

  if (
    typeof value !==
    "string"
  ) {
    if (required) {
      throw new AdminProductActionError(
        `فیلد ${key} الزامی است.`,
      );
    }

    return null;
  }

  const normalized =
    value.trim();

  if (
    required &&
    !normalized
  ) {
    throw new AdminProductActionError(
      "لطفاً تمام فیلدهای الزامی را تکمیل کنید.",
    );
  }

  if (
    normalized.length >
    maximumLength
  ) {
    throw new AdminProductActionError(
      "طول یکی از فیلدها بیش از حد مجاز است.",
    );
  }

  return normalized || null;
}

function normalizeDigits(
  value: string,
): string {
  const persianDigits =
    "۰۱۲۳۴۵۶۷۸۹";

  const arabicDigits =
    "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(
      /[۰-۹]/g,
      (digit) =>
        String(
          persianDigits.indexOf(
            digit,
          ),
        ),
    )
    .replace(
      /[٠-٩]/g,
      (digit) =>
        String(
          arabicDigits.indexOf(
            digit,
          ),
        ),
    )
    .replace(/[٬,\s]/g, "")
    .replace("٫", ".");
}

function readDecimal(
  formData: FormData,
  key: string,
  fallback: string | null,
): string | null {
  const raw =
    readText(
      formData,
      key,
      40,
    );

  if (!raw) {
    return fallback;
  }

  const normalized =
    normalizeDigits(raw);

  if (
    !/^\d+(\.\d+)?$/.test(
      normalized,
    )
  ) {
    throw new AdminProductActionError(
      "مقادیر عددی معتبر نیستند.",
    );
  }

  if (
    Number(normalized) < 0
  ) {
    throw new AdminProductActionError(
      "مقادیر عددی نمی‌توانند منفی باشند.",
    );
  }

  return normalized;
}

function readInteger(
  formData: FormData,
  key: string,
  fallback = 0,
  minimum = 0,
  maximum = 1_000_000,
): number {
  const raw =
    readText(
      formData,
      key,
      30,
    );

  if (!raw) {
    return fallback;
  }

  const value =
    Number.parseInt(
      normalizeDigits(raw),
      10,
    );

  if (
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new AdminProductActionError(
      "یکی از مقادیر صحیح خارج از محدوده مجاز است.",
    );
  }

  return value;
}

function readEnum<T extends string>(
  formData: FormData,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw =
    readText(
      formData,
      key,
      60,
    );

  return raw &&
    allowed.includes(
      raw as T,
    )
    ? raw as T
    : fallback;
}

function parseProductInput(
  formData: FormData,
): ParsedProductInput {
  const locale =
    formData.get("locale") ===
    "en"
      ? "en"
      : "fa";

  const slug =
    readText(
      formData,
      "slug",
      160,
      true,
    )!;

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug,
    )
  ) {
    throw new AdminProductActionError(
      "شناسه URL باید فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد.",
    );
  }

  const primaryImageUrl =
    readText(
      formData,
      "primaryImageUrl",
      1000,
    );

  if (
    primaryImageUrl &&
    !(
      primaryImageUrl.startsWith("/") ||
      primaryImageUrl.startsWith("https://")
    )
  ) {
    throw new AdminProductActionError(
      "آدرس تصویر باید با / یا https:// آغاز شود.",
    );
  }

  const pricingMode =
    readEnum(
      formData,
      "pricingMode",
      [
        "DYNAMIC",
        "MANUAL",
      ] as const,
      "DYNAMIC",
    );

  const price =
    readDecimal(
      formData,
      "price",
      null,
    );

  if (
    pricingMode === "MANUAL" &&
    (!price || Number(price) <= 0)
  ) {
    throw new AdminProductActionError(
      "برای قیمت‌گذاری دستی، قیمت نهایی محصول الزامی است.",
    );
  }

  const stock =
    readInteger(
      formData,
      "stock",
      0,
      0,
      1_000_000,
    );

  let status =
    readEnum(
      formData,
      "status",
      [
        "DRAFT",
        "ACTIVE",
        "OUT_OF_STOCK",
        "ARCHIVED",
      ] as const,
      "DRAFT",
    );

  if (
    stock === 0 &&
    status === "ACTIVE"
  ) {
    status =
      "OUT_OF_STOCK";
  }

  return {
    locale,
    collectionId:
      readText(
        formData,
        "collectionId",
        80,
        true,
      )!,
    slug,
    sku:
      readText(
        formData,
        "sku",
        120,
      ),
    nameFa:
      readText(
        formData,
        "nameFa",
        240,
        true,
      )!,
    nameEn:
      readText(
        formData,
        "nameEn",
        240,
        true,
      )!,
    descriptionFa:
      readText(
        formData,
        "descriptionFa",
        10_000,
      ),
    descriptionEn:
      readText(
        formData,
        "descriptionEn",
        10_000,
      ),
    legendFa:
      readText(
        formData,
        "legendFa",
        5_000,
      ),
    legendEn:
      readText(
        formData,
        "legendEn",
        5_000,
      ),
    material:
      readEnum(
        formData,
        "material",
        [
          "GOLD",
          "SILVER",
        ] as const,
        "GOLD",
      ),
    pricingMode,
    price,
    compareAtPrice:
      readDecimal(
        formData,
        "compareAtPrice",
        null,
      ),
    metalWeight:
      readDecimal(
        formData,
        "metalWeight",
        null,
      ),
    purity:
      readText(
        formData,
        "purity",
        80,
      ),
    purityFineness:
      readText(
        formData,
        "purityFineness",
        20,
      )
        ? readInteger(
            formData,
            "purityFineness",
            750,
            1,
            1000,
          )
        : null,
    makingChargeType:
      readEnum(
        formData,
        "makingChargeType",
        [
          "NONE",
          "FIXED",
          "PER_GRAM",
          "PERCENT",
          "COMBINED",
        ] as const,
        "NONE",
      ),
    makingChargeFixed:
      readDecimal(
        formData,
        "makingChargeFixed",
        "0",
      )!,
    makingChargePerGram:
      readDecimal(
        formData,
        "makingChargePerGram",
        "0",
      )!,
    makingChargePercent:
      readDecimal(
        formData,
        "makingChargePercent",
        "0",
      )!,
    artisticFee:
      readDecimal(
        formData,
        "artisticFee",
        "0",
      )!,
    profitPercent:
      readDecimal(
        formData,
        "profitPercent",
        null,
      ),
    taxPercent:
      readDecimal(
        formData,
        "taxPercent",
        null,
      ),
    stock,
    status,
    isFeatured:
      formData.get("isFeatured") ===
      "on",
    displayOrder:
      readInteger(
        formData,
        "displayOrder",
        0,
        -100_000,
        100_000,
      ),
    primaryImageUrl,
  };
}

async function ensureUniqueIdentity({
  slug,
  sku,
  excludedProductId,
}: {
  slug: string;
  sku: string | null;
  excludedProductId?: string;
}): Promise<void> {
  const duplicate =
    await withDatabaseRetry(() => prisma.product.findFirst({
      where: {
        ...(excludedProductId
          ? {
              id: {
                not:
                  excludedProductId,
              },
            }
          : {}),
        OR: [
          {
            slug,
          },
          ...(sku
            ? [
                {
                  sku,
                },
              ]
            : []),
        ],
      },
      select: {
        slug: true,
        sku: true,
      },
    }), { attempts: 2, delayMilliseconds: 250 });

  if (!duplicate) {
    return;
  }

  if (
    duplicate.slug === slug
  ) {
    throw new AdminProductActionError(
      "این شناسه URL قبلاً برای محصول دیگری استفاده شده است.",
    );
  }

  throw new AdminProductActionError(
    "این کد SKU قبلاً برای محصول دیگری استفاده شده است.",
  );
}

function productData(
  input: ParsedProductInput,
) {
  return {
    collectionId:
      input.collectionId,
    slug:
      input.slug,
    sku:
      input.sku,
    nameFa:
      input.nameFa,
    nameEn:
      input.nameEn,
    descriptionFa:
      input.descriptionFa,
    descriptionEn:
      input.descriptionEn,
    legendFa:
      input.legendFa,
    legendEn:
      input.legendEn,
    material:
      input.material,
    pricingMode:
      input.pricingMode,
    price:
      input.price,
    compareAtPrice:
      input.compareAtPrice,
    metalWeight:
      input.metalWeight,
    purity:
      input.purity,
    purityFineness:
      input.purityFineness,
    makingChargeType:
      input.makingChargeType,
    makingChargeFixed:
      input.makingChargeFixed,
    makingChargePerGram:
      input.makingChargePerGram,
    makingChargePercent:
      input.makingChargePercent,
    artisticFee:
      input.artisticFee,
    profitPercent:
      input.profitPercent,
    taxPercent:
      input.taxPercent,
    stock:
      input.stock,
    status:
      input.status,
    isFeatured:
      input.isFeatured,
    displayOrder:
      input.displayOrder,
  };
}

export async function createAdminProductAction(
  _previousState: AdminProductActionState,
  formData: FormData,
): Promise<AdminProductActionState> {
  if (!(await hasValidAdminSession())) {
    return {
      error: "نشست مدیریت منقضی شده است؛ دوباره وارد شوید.",
    };
  }

  let input: ParsedProductInput;

  try {
    input =
      parseProductInput(
        formData,
      );

    await ensureUniqueIdentity({
      slug:
        input.slug,
      sku:
        input.sku,
    });

    await withDatabaseRetry(() =>
      prisma.product.create({
        data: {
          ...productData(input),
          ...(input.primaryImageUrl
            ? {
                images: {
                  create: {
                    imageUrl: input.primaryImageUrl,
                    altFa: input.nameFa,
                    altEn: input.nameEn,
                    isPrimary: true,
                    displayOrder: 0,
                  },
                },
              }
            : {}),
        },
        select: { id: true },
      }),
      { attempts: 2, delayMilliseconds: 150 },
    );
  } catch (error) {
    return {
      error:
        publicAdminProductError(error, "ساخت محصول انجام نشد.", "create"),
    };
  }

  revalidatePath(
    `/${input.locale}/products`,
  );
  revalidatePath(
    `/${input.locale}/admin/products`,
  );

  redirect(
    `/${input.locale}/admin/products?created=1`,
  );
}

export async function updateAdminProductAction(
  productId: string,
  _previousState: AdminProductActionState,
  formData: FormData,
): Promise<AdminProductActionState> {
  if (!(await hasValidAdminSession())) {
    return {
      error: "نشست مدیریت منقضی شده است؛ دوباره وارد شوید.",
    };
  }

  let input: ParsedProductInput;

  try {
    input =
      parseProductInput(
        formData,
      );

    await ensureUniqueIdentity({
      slug:
        input.slug,
      sku:
        input.sku,
      excludedProductId:
        productId,
    });

    await withDatabaseRetry(() =>
      prisma.product.update({
        where: { id: productId },
        data: productData(input),
      }),
      { attempts: 2, delayMilliseconds: 150 },
    );

    if (input.primaryImageUrl) {
      const primaryImage = await withDatabaseRetry(() =>
        prisma.productImage.findFirst({
          where: {
            productId,
            isPrimary: true,
          },
          orderBy: { displayOrder: "asc" },
          select: { id: true },
        }),
        { attempts: 2, delayMilliseconds: 150 },
      );

      if (primaryImage) {
        await withDatabaseRetry(() =>
          prisma.productImage.update({
            where: { id: primaryImage.id },
            data: {
              imageUrl: input.primaryImageUrl!,
              altFa: input.nameFa,
              altEn: input.nameEn,
            },
          }),
          { attempts: 2, delayMilliseconds: 150 },
        );
      } else {
        await withDatabaseRetry(() =>
          prisma.productImage.create({
            data: {
              productId,
              imageUrl: input.primaryImageUrl!,
              altFa: input.nameFa,
              altEn: input.nameEn,
              isPrimary: true,
              displayOrder: 0,
            },
          }),
          { attempts: 2, delayMilliseconds: 150 },
        );
      }
    }
  } catch (error) {
    return {
      error:
        publicAdminProductError(error, "ذخیره تغییرات محصول انجام نشد.", "update"),
    };
  }

  revalidatePath(
    `/${input.locale}/products`,
  );
  revalidatePath(
    `/${input.locale}/products/${input.slug}`,
  );
  revalidatePath(
    `/${input.locale}/admin/products`,
  );
  revalidatePath(
    `/${input.locale}/admin/products/${productId}`,
  );

  redirect(
    `/${input.locale}/admin/products/${productId}?saved=1`,
  );
}
