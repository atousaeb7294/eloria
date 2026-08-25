import { generateProductMyth } from "@/lib/product-myth-generator";
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
  isAllowedProductImageUrl,
} from "@/lib/product-media-storage";

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
        `ÙÛŒÙ„Ø¯ ${key} Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.`,
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
      "Ù„Ø·ÙØ§Ù‹ ØªÙ…Ø§Ù… ÙÛŒÙ„Ø¯Ù‡Ø§ÛŒ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø±Ø§ ØªÚ©Ù…ÛŒÙ„ Ú©Ù†ÛŒØ¯.",
    );
  }

  if (
    normalized.length >
    maximumLength
  ) {
    throw new AdminProductActionError(
      "Ø·ÙˆÙ„ ÛŒÚ©ÛŒ Ø§Ø² ÙÛŒÙ„Ø¯Ù‡Ø§ Ø¨ÛŒØ´ Ø§Ø² Ø­Ø¯ Ù…Ø¬Ø§Ø² Ø§Ø³Øª.",
    );
  }

  return normalized || null;
}

function normalizeDigits(
  value: string,
): string {
  const persianDigits =
    "Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹";

  const arabicDigits =
    "Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©";

  return value
    .replace(
      /[Û°-Û¹]/g,
      (digit) =>
        String(
          persianDigits.indexOf(
            digit,
          ),
        ),
    )
    .replace(
      /[Ù -Ù©]/g,
      (digit) =>
        String(
          arabicDigits.indexOf(
            digit,
          ),
        ),
    )
    .replace(/[Ù¬,\s]/g, "")
    .replace("Ù«", ".");
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
      "Ù…Ù‚Ø§Ø¯ÛŒØ± Ø¹Ø¯Ø¯ÛŒ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³ØªÙ†Ø¯.",
    );
  }

  if (
    Number(normalized) < 0
  ) {
    throw new AdminProductActionError(
      "Ù…Ù‚Ø§Ø¯ÛŒØ± Ø¹Ø¯Ø¯ÛŒ Ù†Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ù†Ø¯ Ù…Ù†ÙÛŒ Ø¨Ø§Ø´Ù†Ø¯.",
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

  const normalized =
    normalizeDigits(raw);

  if (
    !/^\d+$/.test(
      normalized,
    )
  ) {
    throw new AdminProductActionError(
      "ÛŒÚ©ÛŒ Ø§Ø² Ù…Ù‚Ø§Ø¯ÛŒØ± ØµØ­ÛŒØ­ Ø®Ø§Ø±Ø¬ Ø§Ø² Ù…Ø­Ø¯ÙˆØ¯Ù‡ Ù…Ø¬Ø§Ø² Ø§Ø³Øª.",
    );
  }

  const value =
    Number(normalized);

  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new AdminProductActionError(
      "ÛŒÚ©ÛŒ Ø§Ø² Ù…Ù‚Ø§Ø¯ÛŒØ± ØµØ­ÛŒØ­ Ø®Ø§Ø±Ø¬ Ø§Ø² Ù…Ø­Ø¯ÙˆØ¯Ù‡ Ù…Ø¬Ø§Ø² Ø§Ø³Øª.",
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
      "Ø´Ù†Ø§Ø³Ù‡ URL Ø¨Ø§ÛŒØ¯ ÙÙ‚Ø· Ø´Ø§Ù…Ù„ Ø­Ø±ÙˆÙ Ø§Ù†Ú¯Ù„ÛŒØ³ÛŒ Ú©ÙˆÚ†Ú©ØŒ Ø¹Ø¯Ø¯ Ùˆ Ø®Ø· ØªÛŒØ±Ù‡ Ø¨Ø§Ø´Ø¯.",
    );
  }

  const primaryImageUrl =
    readText(
      formData,
      "primaryImageUrl",
      1000,
    );

  if (primaryImageUrl && !isAllowedProductImageUrl(primaryImageUrl)) {
    throw new AdminProductActionError(
      "Ø¢Ø¯Ø±Ø³ ØªØµÙˆÛŒØ± Ø®Ø§Ø±Ø¬ Ø§Ø² Ù…Ø³ÛŒØ± ÛŒØ§ Ù…ÛŒØ²Ø¨Ø§Ù†â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø² Ø§Ø³Øª.",
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
      "Ø¨Ø±Ø§ÛŒ Ù‚ÛŒÙ…Øªâ€ŒÚ¯Ø°Ø§Ø±ÛŒ Ø¯Ø³ØªÛŒØŒ Ù‚ÛŒÙ…Øª Ù†Ù‡Ø§ÛŒÛŒ Ù…Ø­ØµÙˆÙ„ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.",
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
      "Ø§ÛŒÙ† Ø´Ù†Ø§Ø³Ù‡ URL Ù‚Ø¨Ù„Ø§Ù‹ Ø¨Ø±Ø§ÛŒ Ù…Ø­ØµÙˆÙ„ Ø¯ÛŒÚ¯Ø±ÛŒ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø´Ø¯Ù‡ Ø§Ø³Øª.",
    );
  }

  throw new AdminProductActionError(
    "Ø§ÛŒÙ† Ú©Ø¯ SKU Ù‚Ø¨Ù„Ø§Ù‹ Ø¨Ø±Ø§ÛŒ Ù…Ø­ØµÙˆÙ„ Ø¯ÛŒÚ¯Ø±ÛŒ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø´Ø¯Ù‡ Ø§Ø³Øª.",
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
      error: "Ù†Ø´Ø³Øª Ù…Ø¯ÛŒØ±ÛŒØª Ù…Ù†Ù‚Ø¶ÛŒ Ø´Ø¯Ù‡ Ø§Ø³ØªØ› Ø¯ÙˆØ¨Ø§Ø±Ù‡ ÙˆØ§Ø±Ø¯ Ø´ÙˆÛŒØ¯.",
    };
  }

  let input: ParsedProductInput;

  try {
    input =
      parseProductInput(
        formData,
      );

    
    const myth =
      generateProductMyth({
        nameFa: input.nameFa,
        nameEn: input.nameEn,
      });
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
          mythNameFa: myth.mythNameFa,
          mythNameEn: myth.mythNameEn,
          legendFa: myth.legendFa,
          legendEn: myth.legendEn,
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
        publicAdminProductError(error, "Ø³Ø§Ø®Øª Ù…Ø­ØµÙˆÙ„ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯.", "create"),
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
      error: "Ù†Ø´Ø³Øª Ù…Ø¯ÛŒØ±ÛŒØª Ù…Ù†Ù‚Ø¶ÛŒ Ø´Ø¯Ù‡ Ø§Ø³ØªØ› Ø¯ÙˆØ¨Ø§Ø±Ù‡ ÙˆØ§Ø±Ø¯ Ø´ÙˆÛŒØ¯.",
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

    await withDatabaseRetry(
      () =>
        prisma.$transaction(async transaction => {
          await transaction.product.update({
            where: { id: productId },
            data: productData(input),
          });

          if (!input.primaryImageUrl) return;

          const primaryImage =
            await transaction.productImage.findFirst({
              where: {
                productId,
                isPrimary: true,
              },
              orderBy: { displayOrder: "asc" },
              select: { id: true },
            });

          if (primaryImage) {
            await transaction.productImage.update({
              where: { id: primaryImage.id },
              data: {
                imageUrl: input.primaryImageUrl!,
                altFa: input.nameFa,
                altEn: input.nameEn,
              },
            });
          } else {
            await transaction.productImage.create({
              data: {
                productId,
                imageUrl: input.primaryImageUrl!,
                altFa: input.nameFa,
                altEn: input.nameEn,
                isPrimary: true,
                displayOrder: 0,
              },
            });
          }
        }),
      { attempts: 2, delayMilliseconds: 150 },
    );
  } catch (error) {
    return {
      error:
        publicAdminProductError(error, "Ø°Ø®ÛŒØ±Ù‡ ØªØºÛŒÛŒØ±Ø§Øª Ù…Ø­ØµÙˆÙ„ Ø§Ù†Ø¬Ø§Ù… Ù†Ø´Ø¯.", "update"),
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









