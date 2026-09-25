"use server";
import { readWeightGrams } from "@/lib/weight-units";
import { after } from "next/server";
import { repairSeoBatch } from "@/lib/seo-autopilot";

import { productAudience, withProductAudience, type ProductAudience } from "@/lib/product-audience";

import {
  ELORIA_MYTH_LIBRARY,
  ELORIA_MEN_MYTH_LIBRARY,
  getProductMythByKey,
  generateUnusedProductMyth,
} from "@/lib/product-myth-generator";

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

export async function reassignCanonicalProductLegendsAction(
  locale: "fa" | "en",
): Promise<never> {
  if (!(await hasValidAdminSession())) {
    redirect(`/${locale}/admin/login`);
  }

  const products = await withDatabaseRetry(
    () =>
      prisma.product.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          nameFa: true,
          nameEn: true,
          material: true,
          specifications: true,
        },
      }),
    { attempts: 2, delayMilliseconds: 200 },
  );

  if (products.filter(p => productAudience(p.specifications) === "WOMEN").length > ELORIA_MYTH_LIBRARY.length || products.filter(p => productAudience(p.specifications) === "MEN").length > ELORIA_MEN_MYTH_LIBRARY.length) {
    redirect(`/${locale}/admin/products?legends=too-many`);
  }

  await withDatabaseRetry(
    () =>
      prisma.$transaction(async (transaction) => {
        await transaction.product.updateMany({
          data: { mythKey: null },
        });

        const used = new Set<string>();

        for (const product of products) {
          const myth = generateUnusedProductMyth(
            {
              nameFa: product.nameFa,
              nameEn: product.nameEn,
              material: product.material,
              audience: productAudience(product.specifications),
            },
            used,
          );

          await transaction.product.update({
            where: { id: product.id },
            data: {
              mythKey: myth.mythKey,
              mythNameFa: myth.mythNameFa,
              mythNameEn: myth.mythNameEn,
              legendFa: myth.legendFa,
              legendEn: myth.legendEn,
            },
          });

          used.add(myth.mythKey);
        }
      }),
    { attempts: 2, delayMilliseconds: 200 },
  );

  revalidatePath(`/${locale}/products`);
  revalidatePath(`/${locale}/admin/products`);
  redirect(`/${locale}/admin/products?legends=synced`);
}

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
  audience: ProductAudience;
  collectionId: string;
  slug: string;
  sku: string | null;
  nameFa: string;
  nameEn: string;
  descriptionFa: string | null;
  descriptionEn: string | null;
  legendFa: string | null;
  legendEn: string | null;
  characterImageUrl: string | null;
  worldSceneImageUrl: string | null;
  material: "GOLD" | "SILVER";
  hasGold: boolean;
  hasSilver: boolean;
  goldComponentWeight: string | null;
  silverComponentWeight: string | null;
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

function readProductImageUrl(formData: FormData, key: string): string | null {
  const imageUrl = readText(formData, key, 2_048);
  if (imageUrl && !isAllowedProductImageUrl(imageUrl)) {
    throw new AdminProductActionError("نشانی تصویر باید HTTPS و متعلق به فضای تصاویر مجاز الوریا باشد.");
  }
  return imageUrl;
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


function readWeight(form: FormData, key: string, fallback: string | null = null): string | null {
  try { return readWeightGrams(form, key, fallback); }
  catch (error) { throw new AdminProductActionError((error as Error).message); }
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

  const normalized =
    normalizeDigits(raw);

  if (
    !/^\d+$/.test(
      normalized,
    )
  ) {
    throw new AdminProductActionError(
      "یکی از مقادیر صحیح خارج از محدوده مجاز است.",
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

  if (primaryImageUrl && !isAllowedProductImageUrl(primaryImageUrl)) {
    throw new AdminProductActionError(
      "آدرس تصویر خارج از مسیر یا میزبان‌های مجاز است.",
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

  const material = readEnum(formData, "material", ["GOLD", "SILVER"] as const, "GOLD");
  const hasGold = formData.get("hasGold") === "on";
  const hasSilver = formData.get("hasSilver") === "on";
  if (!hasGold && !hasSilver && pricingMode !== "MANUAL") {
    throw new AdminProductActionError("برای گنجینهٔ بافت بدون فلز، قیمت‌گذاری ثابت را انتخاب کنید.");
  }
  const goldComponentWeight = readWeight(formData, "goldComponentWeight", material === "GOLD" ? readWeight(formData, "metalWeight", null) : null);
  const silverComponentWeight = readWeight(formData, "silverComponentWeight", material === "SILVER" ? readWeight(formData, "metalWeight", null) : null);
  if (hasGold && hasSilver && (!goldComponentWeight || !silverComponentWeight || Number(goldComponentWeight) <= 0 || Number(silverComponentWeight) <= 0)) {
    throw new AdminProductActionError("برای اثر ترکیبی، وزن طلا و وزن نقره را جداگانه و بیشتر از صفر وارد کنید.");
  }

  return {
    locale,
    audience: readEnum(formData, "audience", ["WOMEN", "MEN"] as const, "WOMEN"),
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
    characterImageUrl: readProductImageUrl(formData, "characterImageUrl"),
    worldSceneImageUrl: readProductImageUrl(formData, "worldSceneImageUrl"),
    material,
    hasGold,
    hasSilver,
    goldComponentWeight,
    silverComponentWeight,
    pricingMode,
    price,
    compareAtPrice:
      readDecimal(
        formData,
        "compareAtPrice",
        null,
      ),
    metalWeight:
      readWeight(
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
    taxPercent: "0",
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
    characterImageUrl: input.characterImageUrl,
    worldSceneImageUrl: input.worldSceneImageUrl,
    material:
      input.material,
    hasGold: input.hasGold,
    hasSilver: input.hasSilver,
    goldComponentWeight: input.hasGold ? input.goldComponentWeight : null,
    silverComponentWeight: input.hasSilver ? input.silverComponentWeight : null,
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

    
    const assignedMyths = await withDatabaseRetry(() =>
      prisma.product.findMany({
        where: { mythKey: { not: null } },
        select: { mythKey: true },
      }),
    );
    let myth;
    try {
      myth = generateUnusedProductMyth(
        {
          nameFa: input.nameFa,
          nameEn: input.nameEn,
          material: input.material,
          audience: input.audience,
        },
        new Set(
          assignedMyths.flatMap((item) => (item.mythKey ? [item.mythKey] : [])),
        ),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "ELORIA_MYTH_LIBRARY_EXHAUSTED"
      ) {
        throw new AdminProductActionError(
          "همهٔ افسانه‌های مجاز گروه انتخاب‌شده به محصول اختصاص یافته‌اند؛ برای جلوگیری از تکرار، محصول تازه بدون افسانه ذخیره نشد.",
        );
      }
      throw error;
    }
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
          specifications: withProductAudience(null, input.audience),
          mythKey: myth.mythKey,
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
          timelineEvents: {
            create: {
              eventType: "CREATED",
              actorType: "ADMIN",
              actorLabel: "مدیر الوریا",
              titleFa: "ثبت اولیه قطعه در سامانه",
              metalWeight: input.metalWeight,
              priceToman: input.price,
              stock: input.stock,
              details: {
                slug: input.slug,
                sku: input.sku,
                material: input.material,
                status: input.status,
              },
            },
          },
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

  after(async () => { try { await repairSeoBatch({}, { productSlug: input.slug }); } catch (error) { console.error("[SEO] Product repair deferred to scheduled retry", error); } });

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

    await withDatabaseRetry(
      () =>
        prisma.$transaction(async transaction => {
          const before = await transaction.product.findUniqueOrThrow({
            where: { id: productId },
            select: {
              slug: true,
              sku: true,
              metalWeight: true,
              price: true,
              stock: true,
              status: true,
              pricingMode: true,
              specifications: true,
              mythKey: true,
              mythNameFa: true,
              mythNameEn: true,
            },
          });

          const mythInput = { nameFa: input.nameFa, nameEn: input.nameEn, material: input.material, audience: input.audience };
          const currentMyth = before.mythKey ? getProductMythByKey(before.mythKey, mythInput) : null;
          let myth = currentMyth;
          if (!myth) {
            const assigned = await transaction.product.findMany({
              where: { id: { not: productId }, mythKey: { not: null } }, select: { mythKey: true },
            });
            myth = generateUnusedProductMyth(mythInput, new Set(assigned.flatMap(p => p.mythKey ? [p.mythKey] : [])));
          }
          await transaction.product.update({
            where: { id: productId },
            data: { ...productData(input), specifications: withProductAudience(before.specifications, input.audience),
              mythKey: myth.mythKey, mythNameFa: myth.mythNameFa, mythNameEn: myth.mythNameEn,
              legendFa: currentMyth && input.legendFa
                ? (before.mythNameFa ? input.legendFa.split(before.mythNameFa).join(myth.mythNameFa) : input.legendFa)
                : myth.legendFa,
              legendEn: currentMyth && input.legendEn
                ? (before.mythNameEn ? input.legendEn.split(before.mythNameEn).join(myth.mythNameEn) : input.legendEn)
                : myth.legendEn,
            },
          });

          const changedFields = [
            productAudience(before.specifications) !== input.audience ? "audience" : null,
            before.slug !== input.slug ? "slug" : null,
            (before.sku ?? null) !== input.sku ? "sku" : null,
            (before.metalWeight?.toString() ?? null) !== input.metalWeight ? "metalWeight" : null,
            (before.price?.toString() ?? null) !== input.price ? "price" : null,
            before.stock !== input.stock ? "stock" : null,
            before.status !== input.status ? "status" : null,
            before.pricingMode !== input.pricingMode ? "pricingMode" : null,
          ].filter((field): field is string => Boolean(field));

          await transaction.productTimelineEvent.create({
            data: {
              productId,
              eventType: changedFields.length ? "UPDATED" : "REVIEWED",
              actorType: "ADMIN",
              actorLabel: "مدیر الوریا",
              titleFa: changedFields.length
                ? "ویرایش اطلاعات، وزن، قیمت یا موجودی قطعه"
                : "بازبینی و ذخیره اطلاعات قطعه",
              metalWeight: input.metalWeight,
              priceToman: input.price,
              stock: input.stock,
              details: {
                changedFields,
                previous: {
                  slug: before.slug,
                  sku: before.sku,
                  metalWeight: before.metalWeight?.toString() ?? null,
                  priceToman: before.price?.toString() ?? null,
                  stock: before.stock,
                  status: before.status,
                  pricingMode: before.pricingMode,
                },
                current: {
                  slug: input.slug,
                  sku: input.sku,
                  metalWeight: input.metalWeight,
                  priceToman: input.price,
                  stock: input.stock,
                  status: input.status,
                  pricingMode: input.pricingMode,
                },
              },
            },
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
        publicAdminProductError(error, "ذخیره تغییرات محصول انجام نشد.", "update"),
    };
  }

  after(async () => { try { await repairSeoBatch({}, { productSlug: input.slug }); } catch (error) { console.error("[SEO] Product repair deferred to scheduled retry", error); } });

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

