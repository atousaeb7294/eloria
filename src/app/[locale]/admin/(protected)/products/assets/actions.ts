"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { ProductMediaStorageError, removeStoredProductImage, storeProductImage } from "@/lib/product-media-storage";
import { prisma } from "@/lib/prisma";
import { syncProductInventory } from "@/lib/inventory";

type Locale = "fa" | "en";
const MAX_UPLOAD_COUNT = 8;

class AdminProductAssetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminProductAssetError";
  }
}

function publicAssetError(error: unknown, fallback: string): string {
  if (error instanceof AdminProductAssetError || error instanceof ProductMediaStorageError) {
    return error.message;
  }
  console.error("[Eloria Admin Product Asset] Unexpected error.", error);
  return fallback;
}

function localeOf(value: string): Locale { return value === "en" ? "en" : "fa"; }
function digits(value: string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return value.replace(/[۰-۹]/g, d => String(fa.indexOf(d))).replace(/[٠-٩]/g, d => String(ar.indexOf(d))).replace(/[٬,\s]/g, "").replace("٫", ".");
}
function text(form: FormData, key: string, max: number, required = false): string | null {
  const raw = form.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  if (required && !value) throw new AdminProductAssetError("فیلدهای الزامی را تکمیل کنید.");
  if (value.length > max) throw new AdminProductAssetError("طول یکی از فیلدها بیش از حد مجاز است.");
  return value || null;
}
function integer(form: FormData, key: string, fallback = 0, min = 0, max = 1_000_000): number {
  const raw = text(form, key, 30);
  if (!raw) return fallback;
  const value = Number.parseInt(digits(raw), 10);
  if (!Number.isInteger(value) || value < min || value > max) throw new AdminProductAssetError("مقدار عددی معتبر نیست.");
  return value;
}
function decimal(form: FormData, key: string): string | null {
  const raw = text(form, key, 40);
  if (!raw) return null;
  const value = digits(raw);
  if (!/^\d+(\.\d+)?$/.test(value)) throw new AdminProductAssetError("مقدار اعشاری معتبر نیست.");
  return value;
}
async function session() {
  if (!(await hasValidAdminSession())) throw new AdminProductAssetError("نشست مدیریت منقضی شده است.");
}
async function product(productId: string) {
  const item = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, slug: true, nameFa: true, nameEn: true } });
  if (!item) throw new AdminProductAssetError("محصول پیدا نشد.");
  return item;
}
function refresh(productId: string, slug: string) {
  for (const locale of ["fa", "en"] as const) {
    revalidatePath(`/${locale}/admin/products/${productId}`);
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}/products`);
    revalidatePath(`/${locale}/products/${slug}`);
  }
}
function messageUrl(locale: Locale, productId: string, key: string, value = "1") {
  return `/${locale}/admin/products/${productId}?${key}=${encodeURIComponent(value)}`;
}
async function promote(productId: string) {
  if (await prisma.productImage.findFirst({ where: { productId, isPrimary: true }, select: { id: true } })) return;
  const first = await prisma.productImage.findFirst({ where: { productId }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  if (first) await prisma.productImage.update({ where: { id: first.id }, data: { isPrimary: true } });
}

export async function uploadAdminProductImagesAction(productId: string, localeValue: string, form: FormData): Promise<void> {
  await session();
  const locale = localeOf(localeValue);
  const item = await product(productId);
  const files = form.getAll("images").filter((v): v is File => v instanceof File && v.size > 0);
  if (!files.length) redirect(messageUrl(locale, productId, "mediaError", "فایلی انتخاب نشده است."));
  if (files.length > MAX_UPLOAD_COUNT) redirect(messageUrl(locale, productId, "mediaError", "حداکثر ۸ تصویر در هر بار مجاز است."));
  const existing = await prisma.productImage.count({ where: { productId } });
  const urls: string[] = [];
  try {
    for (const file of files) urls.push(await storeProductImage(productId, file));
    await prisma.$transaction(urls.map((imageUrl, index) => prisma.productImage.create({ data: {
      productId, imageUrl, altFa: item.nameFa, altEn: item.nameEn,
      isPrimary: existing === 0 && index === 0, displayOrder: existing + index,
    }})));
  } catch (error) {
    await Promise.all(urls.map(removeStoredProductImage));
    redirect(messageUrl(locale, productId, "mediaError", publicAssetError(error, "آپلود ناموفق بود.")));
  }
  refresh(productId, item.slug);
  redirect(messageUrl(locale, productId, "mediaSaved"));
}

export async function addAdminProductImageUrlAction(productId: string, localeValue: string, form: FormData): Promise<void> {
  await session();
  const locale = localeOf(localeValue);
  const item = await product(productId);
  const imageUrl = text(form, "imageUrl", 1000, true)!;
  if (!(imageUrl.startsWith("/") || imageUrl.startsWith("https://"))) {
    redirect(messageUrl(locale, productId, "mediaError", "آدرس تصویر باید با / یا https:// شروع شود."));
  }
  const count = await prisma.productImage.count({ where: { productId } });
  await prisma.productImage.create({ data: {
    productId, imageUrl,
    altFa: text(form, "altFa", 240) ?? item.nameFa,
    altEn: text(form, "altEn", 240) ?? item.nameEn,
    isPrimary: count === 0, displayOrder: count,
  }});
  refresh(productId, item.slug);
  redirect(messageUrl(locale, productId, "mediaSaved"));
}

export async function updateAdminProductImageAction(productId: string, imageId: string, localeValue: string, form: FormData): Promise<void> {
  await session();
  const locale = localeOf(localeValue);
  const item = await product(productId);
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) redirect(messageUrl(locale, productId, "mediaError", "تصویر پیدا نشد."));
  const primary = form.get("isPrimary") === "on";
  await prisma.$transaction(async tx => {
    if (primary) await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
    await tx.productImage.update({ where: { id: imageId }, data: {
      altFa: text(form, "altFa", 240), altEn: text(form, "altEn", 240),
      displayOrder: integer(form, "displayOrder", image.displayOrder, -100000, 100000),
      isPrimary: primary ? true : image.isPrimary,
    }});
  });
  refresh(productId, item.slug);
  redirect(messageUrl(locale, productId, "mediaSaved"));
}

export async function deleteAdminProductImageAction(productId: string, imageId: string, localeValue: string): Promise<void> {
  await session();
  const locale = localeOf(localeValue);
  const item = await product(productId);
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) redirect(messageUrl(locale, productId, "mediaError", "تصویر پیدا نشد."));
  await prisma.productImage.delete({ where: { id: imageId } });
  await removeStoredProductImage(image.imageUrl);
  await promote(productId);
  refresh(productId, item.slug);
  redirect(messageUrl(locale, productId, "mediaSaved"));
}

function attributes(form: FormData): Prisma.InputJsonValue | undefined {
  const color = text(form, "color", 100), size = text(form, "size", 100), notes = text(form, "notes", 500);
  return color || size || notes ? ({ color, size, notes } as Prisma.InputJsonValue) : undefined;
}
function variantData(form: FormData) {
  return {
    titleFa: text(form, "titleFa", 240, true)!, titleEn: text(form, "titleEn", 240, true)!,
    sku: text(form, "sku", 120), price: decimal(form, "price"), stock: integer(form, "stock"),
    metalWeight: decimal(form, "metalWeight"), purity: text(form, "purity", 80),
    purityFineness: text(form, "purityFineness", 20) ? integer(form, "purityFineness", 750, 1, 1000) : null,
    makingChargeFixed: decimal(form, "makingChargeFixed"), makingChargePerGram: decimal(form, "makingChargePerGram"),
    makingChargePercent: decimal(form, "makingChargePercent"), artisticFee: decimal(form, "artisticFee"),
    attributes: attributes(form), isActive: form.get("isActive") === "on",
    displayOrder: integer(form, "displayOrder", 0, -100000, 100000),
  };
}
async function uniqueSku(sku: string | null, excluded?: string) {
  if (!sku) return;
  if (await prisma.productVariant.findFirst({ where: { sku, ...(excluded ? { id: { not: excluded } } : {}) }, select: { id: true } })) {
    throw new AdminProductAssetError("این SKU قبلاً استفاده شده است.");
  }
}
export async function createAdminProductVariantAction(productId: string, localeValue: string, form: FormData): Promise<void> {
  await session(); const locale = localeOf(localeValue); const item = await product(productId);
  try { const data = variantData(form); await uniqueSku(data.sku); await prisma.$transaction(async transaction => { await transaction.productVariant.create({ data: { productId, ...data } }); await syncProductInventory(transaction, productId); }); }
  catch (error) { redirect(messageUrl(locale, productId, "variantError", publicAssetError(error, "ساخت تنوع ناموفق بود."))); }
  refresh(productId, item.slug); redirect(messageUrl(locale, productId, "variantSaved"));
}
export async function updateAdminProductVariantAction(productId: string, variantId: string, localeValue: string, form: FormData): Promise<void> {
  await session(); const locale = localeOf(localeValue); const item = await product(productId);
  if (!(await prisma.productVariant.findFirst({ where: { id: variantId, productId }, select: { id: true } }))) redirect(messageUrl(locale, productId, "variantError", "تنوع پیدا نشد."));
  try { const data = variantData(form); await uniqueSku(data.sku, variantId); await prisma.$transaction(async transaction => { await transaction.productVariant.update({ where: { id: variantId }, data }); await syncProductInventory(transaction, productId); }); }
  catch (error) { redirect(messageUrl(locale, productId, "variantError", publicAssetError(error, "ویرایش تنوع ناموفق بود."))); }
  refresh(productId, item.slug); redirect(messageUrl(locale, productId, "variantSaved"));
}
export async function deleteAdminProductVariantAction(productId: string, variantId: string, localeValue: string): Promise<void> {
  await session(); const locale = localeOf(localeValue); const item = await product(productId);
  if (await prisma.orderItem.count({ where: { variantId } })) {
    await prisma.$transaction(async transaction => { await transaction.productVariant.update({ where: { id: variantId }, data: { isActive: false } }); await syncProductInventory(transaction, productId); }); refresh(productId, item.slug); redirect(messageUrl(locale, productId, "variantArchived"));
  }
  await prisma.$transaction(async transaction => { await transaction.productVariant.deleteMany({ where: { id: variantId, productId } }); await syncProductInventory(transaction, productId); }); refresh(productId, item.slug); redirect(messageUrl(locale, productId, "variantSaved"));
}
export async function deleteAdminProductAction(productId: string, localeValue: string): Promise<void> {
  await session(); const locale = localeOf(localeValue);
  const item = await prisma.product.findUnique({ where: { id: productId }, include: { images: { select: { imageUrl: true } }, _count: { select: { orderItems: true } } } });
  if (!item) redirect(`/${locale}/admin/products?missing=1`);
  if (item._count.orderItems) {
    await prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
    refresh(productId, item.slug); redirect(`/${locale}/admin/products?archived=ordered`);
  }
  await prisma.product.delete({ where: { id: productId } });
  await Promise.all(item.images.map(image => removeStoredProductImage(image.imageUrl)));
  refresh(productId, item.slug); redirect(`/${locale}/admin/products?deleted=1`);
}
