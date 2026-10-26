"use server";

import { revalidatePath } from "next/cache";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  HeroPreparationError,
  prepareHeroCutout,
} from "@/lib/hero-cutout";
import { validFeaturedIds, UUID_PATTERN, HERO_PIPELINE_VERSION } from "@/lib/home-design-contract";

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
  mode?: "selected" | "random";
}): Promise<{ ok: boolean; error?: string; version?: string }> {
  if (!(await hasValidAdminSession())) return { ok: false, error: "دوباره وارد مدیریت شوید." };
  if (!input || (input.mode !== undefined && !["selected", "random"].includes(input.mode)) ||
      (input.mode !== "random" && (!UUID_PATTERN.test(input.productId) || !UUID_PATTERN.test(input.imageId))) ||
      !Number.isInteger(input.scale) || input.scale < 60 || input.scale > 100)
    return { ok: false, error: "انتخاب محصول معتبر نیست." };
  try {
    const prepared = input.mode === "random" ? null : await prepareHeroCutout(input.productId, input.imageId);
    const saved = await prisma.$transaction(async tx => {
      const current = await tx.storefrontAppearance.findUnique({ where: { id: "home" }, select: { updatedAt: true } });
      if ((current?.updatedAt.toISOString() ?? null) !== input.expectedVersion) throw new HeroPreparationError("تنظیمات تغییر کرده است؛ صفحه را تازه کنید.");
      if (input.mode === "random") {
        const candidates = await tx.heroCutout.findMany({
          where: { pipelineVersion: HERO_PIPELINE_VERSION, product: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, collection: { isActive: true },
          } },
          take: 64, orderBy: { createdAt: "desc" },
          select: { sourceImageId: true, sourceImageUrl: true, product: { select: { images: { select: { id: true, imageUrl: true } } } } },
        });
        if (!candidates.some(item => item.product.images.some(image => image.id === item.sourceImageId && image.imageUrl === item.sourceImageUrl)))
          throw new HeroPreparationError("ابتدا دست‌کم یک عکس را آماده کنید؛ سپس نمایش تصادفی را ذخیره کنید.");
      }
      return tx.storefrontAppearance.upsert({ where: { id: "home" },
        create: { id: "home", heroCutoutId: prepared?.id ?? null, heroScale: input.scale },
        update: { heroCutoutId: prepared?.id ?? null, heroScale: input.scale },
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
