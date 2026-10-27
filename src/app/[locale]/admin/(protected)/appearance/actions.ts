"use server";

import { createHash } from "node:crypto";
import { normalizeUploadedHero } from "@/lib/home-hero-upload";
import { revalidatePath } from "next/cache";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  HeroPreparationError,
  prepareHeroCutout,
} from "@/lib/hero-cutout";
import { validFeaturedIds, UUID_PATTERN, HERO_PIPELINE_VERSION, UPLOADED_HERO_VERSION, MAX_HERO_BYTES } from "@/lib/home-design-contract";

type PrepareResult =
  { ok: true; id: string; imageUrl: string } | { ok: false; error: string };
export async function prepareHomeHeroAction(
  productId: string,
  imageId: string,
): Promise<PrepareResult> {
  if (!(await hasValidAdminSession()))
    return { ok: false, error: "نشست مدیریت پایان یافته؛ دوباره وارد شوید." };
  if (!UUID_PATTERN.test(productId) || !UUID_PATTERN.test(imageId))
    return { ok: false, error: "انتخاب محصول معتبر نیست." };
  try {
    return { ok: true, ...(await prepareHeroCutout(productId, imageId)) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof HeroPreparationError
          ? error.message
          : "آماده‌سازی عکس انجام نشد. اتصال و سرویس پردازش را بررسی کنید؛ هوم تغییر نکرد.",
    };
  }
}

export async function saveHomeAppearanceAction(input: {
  featuredIds: string[];
  featuredCutoutIds: string[];
  expectedVersion: string | null;
}): Promise<{ ok: boolean; error?: string; version?: string }> {
  if (!(await hasValidAdminSession()))
    return { ok: false, error: "نشست مدیریت پایان یافته؛ دوباره وارد شوید." };
  if (
    !input ||
    !validFeaturedIds(input.featuredIds) ||
    !validFeaturedIds(input.featuredCutoutIds)
  )
    return {
      ok: false,
      error: "دقیقاً هشت محصول متفاوت با تصاویر آماده انتخاب کنید.",
    };
  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const count = await tx.product.count({
          where: {
            id: { in: input.featuredIds },
            status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
            collection: { isActive: true },
            images: { some: { imageUrl: { not: "" } } },
          },
        });
        if (count !== 8)
          throw new HeroPreparationError(
            "یکی از منتخب‌ها دیگر قابل نمایش نیست؛ فهرست را تازه کنید.",
          );
        const prepared = await tx.heroCutout.findMany({
          where: { id: { in: input.featuredCutoutIds } },
          select: {
            id: true,
            productId: true,
            sourceImageId: true,
            sourceImageUrl: true,
          },
        });
        const sourceImages = await tx.productImage.findMany({
          where: { id: { in: prepared.map((c) => c.sourceImageId) } },
          select: { id: true, productId: true, imageUrl: true },
        });
        for (let i = 0; i < 8; i++) {
          const asset = prepared.find(
            (c) =>
              c.id === input.featuredCutoutIds[i] &&
              c.productId === input.featuredIds[i],
          );
          if (
            !asset ||
            !sourceImages.some(
              (image) =>
                image.id === asset.sourceImageId &&
                image.productId === asset.productId &&
                image.imageUrl === asset.sourceImageUrl,
            )
          )
            throw new HeroPreparationError(
              "تصویر یکی از منتخب‌ها تغییر کرده؛ دوباره آماده‌سازی کنید.",
            );
        }
        const current = await tx.storefrontAppearance.findUnique({
          where: { id: "home" },
          select: { updatedAt: true },
        });
        if (
          (current?.updatedAt.toISOString() ?? null) !== input.expectedVersion
        )
          throw new HeroPreparationError(
            "تنظیمات در پنجرهٔ دیگری تغییر کرده است. صفحه را تازه کنید.",
          );
        return tx.storefrontAppearance.upsert({
          where: { id: "home" },
          create: {
            id: "home",
            featuredProductIds: input.featuredIds,
            featuredCutoutIds: input.featuredCutoutIds,
          },
          update: {
            featuredProductIds: input.featuredIds,
            featuredCutoutIds: input.featuredCutoutIds,
          },
          select: { updatedAt: true },
        });
      },
      { isolationLevel: "Serializable", timeout: 10_000 },
    );
    for (const locale of ["fa", "en"]) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/admin/appearance`);
    }
    return { ok: true, version: updated.updatedAt.toISOString() };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof HeroPreparationError
          ? error.message
          : "ذخیره انجام نشد. صفحه را تازه و دوباره تلاش کنید؛ نسخهٔ قبلی حفظ شد.",
    };
  }
}

/** Hero changes must not depend on preparing all eight featured products. */
export async function saveHomeHeroOnlyAction(input: {
  productId: string; imageId: string; scale: number; expectedVersion: string | null;
  mode?: "selected" | "random" | "upload";
  cutoutId?: string;
}): Promise<{ ok: boolean; error?: string; version?: string }> {
  if (!(await hasValidAdminSession())) return { ok: false, error: "دوباره وارد مدیریت شوید." };
  if (!input || (input.mode !== undefined && !["selected", "random", "upload"].includes(input.mode)) ||
      (input.mode === "upload" && (!UUID_PATTERN.test(input.cutoutId ?? "") || !UUID_PATTERN.test(input.productId))) ||
      (input.mode !== "random" && input.mode !== "upload" && (!UUID_PATTERN.test(input.productId) || !UUID_PATTERN.test(input.imageId))) ||
      !Number.isInteger(input.scale) || input.scale < 60 || input.scale > 100)
    return { ok: false, error: "انتخاب محصول معتبر نیست." };
  try {
    const prepared = input.mode === "random" || input.mode === "upload" ? null : await prepareHeroCutout(input.productId, input.imageId);
    const saved = await prisma.$transaction(async tx => {
      const current = await tx.storefrontAppearance.findUnique({ where: { id: "home" }, select: { updatedAt: true } });
      if ((current?.updatedAt.toISOString() ?? null) !== input.expectedVersion) throw new HeroPreparationError("تنظیمات تغییر کرده است؛ صفحه را تازه کنید.");
      const uploaded = input.mode === "upload" ? await tx.heroCutout.findFirst({
        where: { id: input.cutoutId, productId: input.productId, pipelineVersion: UPLOADED_HERO_VERSION,
          product: { status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, collection: { isActive: true } } },
        select: { id: true },
      }) : null;
      if (input.mode === "upload" && !uploaded) throw new HeroPreparationError("عکس بارگذاری‌شده معتبر نیست؛ عکس را دوباره انتخاب کنید.");
      if (input.mode === "random") {
        const candidates = await tx.heroCutout.findMany({
          where: { pipelineVersion: { in: [HERO_PIPELINE_VERSION, UPLOADED_HERO_VERSION] }, product: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, collection: { isActive: true },
          } },
          take: 64, orderBy: { createdAt: "desc" },
          select: { pipelineVersion: true, sourceImageId: true, sourceImageUrl: true, product: { select: { images: { select: { id: true, imageUrl: true } } } } },
        });
        if (!candidates.some(item => item.pipelineVersion === UPLOADED_HERO_VERSION || item.product.images.some(image => image.id === item.sourceImageId && image.imageUrl === item.sourceImageUrl)))
          throw new HeroPreparationError("ابتدا دست‌کم یک عکس را آماده کنید؛ سپس نمایش تصادفی را ذخیره کنید.");
      }
      return tx.storefrontAppearance.upsert({ where: { id: "home" },
        create: { id: "home", heroCutoutId: uploaded?.id ?? prepared?.id ?? null, heroScale: input.scale },
        update: { heroCutoutId: uploaded?.id ?? prepared?.id ?? null, heroScale: input.scale },
        select: { updatedAt: true },
      });
    }, { isolationLevel: "Serializable" });
    for (const locale of ["fa", "en"]) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/admin/appearance`);
    }
    return { ok: true, version: saved.updatedAt.toISOString() };
  } catch (error) {
    return { ok: false, error: error instanceof HeroPreparationError ? error.message : "ذخیره انجام نشد؛ نسخهٔ قبلی حفظ شد." };
  }
}

/** The uploaded image is stored separately from the product gallery. */
export async function uploadHomeHeroAction(form: FormData): Promise<{
  ok: boolean; error?: string; id?: string; imageUrl?: string; version?: string;
}> {
  if (!(await hasValidAdminSession())) return { ok: false, error: "دوباره وارد مدیریت شوید." };
  if (!(form instanceof FormData)) return { ok: false, error: "عکس معتبر انتخاب کنید." };
  const file = form.get("image");
  const productId = String(form.get("productId") ?? "");
  const scale = Number(form.get("scale"));
  const expectedVersion = String(form.get("expectedVersion") ?? "") || null;
  if (!UUID_PATTERN.test(productId) || !Number.isInteger(scale) || scale < 60 || scale > 100)
    return { ok: false, error: "محصول و اندازهٔ تصویر را انتخاب کنید." };
  if (!(file instanceof File) || !file.size || file.size > MAX_HERO_BYTES)
    return { ok: false, error: "یک عکس PNG یا WebP شفاف با حجم حداکثر ۸ مگابایت انتخاب کنید." };
  let photo;
  try { photo = await normalizeUploadedHero(Buffer.from(await file.arrayBuffer())); }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "عکس قابل استفاده نیست." }; }
  try {
    const result = await prisma.$transaction(async tx => {
      const current = await tx.storefrontAppearance.findUnique({ where: { id: "home" }, select: { updatedAt: true } });
      if ((current?.updatedAt.toISOString() ?? null) !== expectedVersion)
        throw new HeroPreparationError("تنظیمات در پنجرهٔ دیگری تغییر کرده است؛ صفحه را تازه کنید.");
      const product = await tx.product.findFirst({
        where: { id: productId, status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, collection: { isActive: true } },
        select: { images: { where: { imageUrl: { not: "" } }, take: 1,
          orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }], select: { id: true, imageUrl: true } } },
      });
      const source = product?.images[0];
      if (!source) throw new HeroPreparationError("محصول انتخاب‌شده دیگر قابل نمایش نیست.");
      const key = { productId, sourceImageId: source.id,
        sourceHash: createHash("sha256").update(photo.bytes).digest("hex"), pipelineVersion: UPLOADED_HERO_VERSION };
      const asset = await tx.heroCutout.upsert({ where: { sourcePipeline: key }, update: {},
        create: { ...key, sourceImageUrl: source.imageUrl, bytes: new Uint8Array(photo.bytes), width: photo.width, height: photo.height },
        select: { id: true },
      });
      const appearance = await tx.storefrontAppearance.upsert({ where: { id: "home" },
        create: { id: "home", heroCutoutId: asset.id, heroScale: scale },
        update: { heroCutoutId: asset.id, heroScale: scale }, select: { updatedAt: true },
      });
      return { id: asset.id, version: appearance.updatedAt.toISOString() };
    }, { isolationLevel: "Serializable", timeout: 10_000 });
    revalidatePath("/");
    for (const locale of ["fa", "en"]) { revalidatePath(`/${locale}`); revalidatePath(`/${locale}/admin/appearance`); }
    return { ok: true, ...result, imageUrl: `/api/media/hero/${result.id}` };
  } catch (error) {
    return { ok: false, error: error instanceof HeroPreparationError ? error.message : "بارگذاری ذخیره نشد؛ عکس قبلی هوم حفظ شد. صفحه را تازه و دوباره تلاش کنید." };
  }
}

/** Soft archive: remove from selection without deleting recoverable image bytes. */
export async function removeUploadedHomeHeroAction(input: { id: string; expectedVersion: string | null }) {
  if (!(await hasValidAdminSession())) return { ok: false, error: "دوباره وارد مدیریت شوید." };
  if (!input || !UUID_PATTERN.test(input.id)) return { ok: false, error: "عکس معتبر نیست." };
  try {
    const version = await prisma.$transaction(async tx => {
      const current = await tx.storefrontAppearance.findUnique({ where: { id: "home" }, select: { updatedAt: true, heroCutoutId: true } });
      if (!current || current.updatedAt.toISOString() !== input.expectedVersion || current.heroCutoutId !== input.id)
        throw new HeroPreparationError("تنظیمات تغییر کرده است؛ صفحه را تازه کنید.");
      const asset = await tx.heroCutout.findFirst({ where: { id: input.id, pipelineVersion: UPLOADED_HERO_VERSION }, select: { id: true } });
      if (!asset) throw new HeroPreparationError("این عکس، بارگذاری مستقیم هوم نیست.");
      await tx.heroCutout.update({ where: { id: input.id }, data: { pipelineVersion: `removed-upload-${input.id}` } });
      const saved = await tx.storefrontAppearance.update({ where: { id: "home" }, data: { heroCutoutId: null }, select: { updatedAt: true } });
      return saved.updatedAt.toISOString();
    }, { isolationLevel: "Serializable" });
    revalidatePath("/");
    for (const locale of ["fa", "en"]) { revalidatePath(`/${locale}`); revalidatePath(`/${locale}/admin/appearance`); }
    return { ok: true, version };
  } catch (error) {
    return { ok: false, error: error instanceof HeroPreparationError ? error.message : "حذف از نمایش انجام نشد؛ دوباره تلاش کنید." };
  }
}
