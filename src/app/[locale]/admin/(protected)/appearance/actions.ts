"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  HeroPreparationError,
  prepareHeroCutout,
  readHeroSource,
} from "@/lib/hero-cutout";
import { validFeaturedIds, UUID_PATTERN } from "@/lib/home-design-contract";

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
  productId: string;
  imageId: string;
  cutoutId: string;
  scale: number;
  featuredIds: string[];
  featuredCutoutIds: string[];
  expectedVersion: string | null;
}): Promise<{ ok: boolean; error?: string; version?: string }> {
  if (!(await hasValidAdminSession()))
    return { ok: false, error: "نشست مدیریت پایان یافته؛ دوباره وارد شوید." };
  if (
    !input ||
    !UUID_PATTERN.test(input.productId) ||
    !UUID_PATTERN.test(input.imageId) ||
    !UUID_PATTERN.test(input.cutoutId) ||
    !Number.isInteger(input.scale) ||
    input.scale < 60 ||
    input.scale > 100 ||
    !validFeaturedIds(input.featuredIds) ||
    !validFeaturedIds(input.featuredCutoutIds)
  )
    return {
      ok: false,
      error: "یک تصویر آماده و دقیقاً هشت محصول متفاوت انتخاب کنید.",
    };
  try {
    const [cutout, source] = await Promise.all([
      prisma.heroCutout.findFirst({
        where: { id: input.cutoutId, productId: input.productId },
        select: { sourceHash: true },
      }),
      prisma.productImage.findFirst({
        where: {
          id: input.imageId,
          productId: input.productId,
          product: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
            collection: { isActive: true },
          },
        },
        select: { imageUrl: true },
      }),
    ]);
    if (
      !cutout ||
      !source ||
      createHash("sha256")
        .update(await readHeroSource(input.productId, source.imageUrl))
        .digest("hex") !== cutout.sourceHash
    )
      return {
        ok: false,
        error: "عکس اصلی تغییر کرده است. آن را دوباره آماده کنید.",
      };
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
            heroCutoutId: input.cutoutId,
            heroScale: input.scale,
            featuredProductIds: input.featuredIds,
            featuredCutoutIds: input.featuredCutoutIds,
          },
          update: {
            heroCutoutId: input.cutoutId,
            heroScale: input.scale,
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
