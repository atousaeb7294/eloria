import "server-only";
import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { acquireCronLease, releaseCronLease } from "@/lib/cron-lease";
import { prepareBuiltinCutout } from "@/lib/builtin-cutout";
import {
  boundedImageBody,
  HERO_PIPELINE_VERSION,
  MAX_HERO_BYTES,
  UUID_PATTERN,
} from "@/lib/home-design-contract";

export class HeroPreparationError extends Error {}

// Only a database-selected product image is passed here. No arbitrary client URL.
export async function readHeroSource(
  productId: string,
  imageUrl: string,
): Promise<Buffer> {
  const storedId = /^\/api\/media\/products\/([^/]+)$/.exec(imageUrl)?.[1];
  if (storedId && UUID_PATTERN.test(storedId)) {
    const asset = await prisma.productMediaAsset.findFirst({
      where: { id: storedId, productId },
      select: { bytes: true },
    });
    if (!asset || asset.bytes.byteLength > MAX_HERO_BYTES)
      throw new HeroPreparationError(
        "عکس اصلی در دسترس نیست یا بیش از ۸ مگابایت است.",
      );
    return Buffer.from(asset.bytes);
  }
  if (imageUrl.startsWith("/") && !imageUrl.startsWith("//")) {
    // Read public assets directly; never fetch an internal API or follow traversal/symlinks.
    const decoded = decodeURIComponent(imageUrl.split("?")[0]);
    if (
      !/^\/(?:images|uploads)\/[a-zA-Z0-9_./ -]+\.(?:png|jpe?g|webp)$/i.test(
        decoded,
      ) ||
      decoded.split("/").includes("..")
    )
      throw new HeroPreparationError(
        "مسیر عکس اصلی برای پردازش پشتیبانی نمی‌شود.",
      );
    const root = await realpath(path.join(process.cwd(), "public"));
    const filename = await realpath(path.join(root, decoded));
    if (
      !filename.startsWith(root + path.sep) ||
      (await stat(filename)).size > MAX_HERO_BYTES
    )
      throw new HeroPreparationError("مسیر یا حجم تصویر معتبر نیست.");
    return readFile(filename);
  }
  const url = new URL(imageUrl);
  const allowed = new Set<string>();
  for (const host of [
    process.env.SUPABASE_URL,
    ...(process.env.ELORIA_ALLOWED_IMAGE_HOSTS ?? "").split(","),
  ]) {
    if (!host?.trim()) continue;
    try {
      allowed.add(
        new URL(host.includes("://") ? host : `https://${host.trim()}`)
          .hostname,
      );
    } catch {}
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !allowed.has(url.hostname)
  )
    throw new HeroPreparationError(
      "میزبان عکس در فهرست منابع مجاز تصاویر نیست.",
    );
  const response = await fetch(url, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new HeroPreparationError("دریافت عکس اصلی موفق نبود.");
  return boundedImageBody(response);
}

export async function prepareHeroCutout(productId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({
    where: {
      id: imageId,
      productId,
      product: {
        status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
        collection: { isActive: true },
      },
    },
    select: { imageUrl: true },
  });
  if (!image)
    throw new HeroPreparationError(
      "محصول یا عکس انتخاب‌شده دیگر قابل نمایش نیست.",
    );
  const bytes = await readHeroSource(productId, image.imageUrl);
  const metadata = await sharp(bytes, {
    limitInputPixels: 40_000_000,
    failOn: "error",
  }).metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    !["png", "jpeg", "webp"].includes(metadata.format ?? "") ||
    (metadata.pages ?? 1) > 1
  )
    throw new HeroPreparationError(
      "یک عکس ثابت PNG، JPEG یا WebP انتخاب کنید.",
    );
  const sourceHash = createHash("sha256").update(bytes).digest("hex");
  const key = {
    productId,
    sourceImageId: imageId,
    sourceHash,
    pipelineVersion: HERO_PIPELINE_VERSION,
  };
  const cached = await prisma.heroCutout.findUnique({
    where: { sourcePipeline: key },
    select: { id: true },
  });
  if (cached)
    return { id: cached.id, imageUrl: `/api/media/hero/${cached.id}` };
  const workerUrl = process.env.ELORIA_CUTOUT_URL;
  const token = process.env.ELORIA_CUTOUT_TOKEN;
  const lease = await acquireCronLease({
    key: "hero-cutout",
    leaseMs: 180_000,
  });
  if (!lease.acquired)
    throw new HeroPreparationError(
      "تصویر دیگری در حال آماده‌سازی است؛ کمی بعد دوباره تلاش کنید.",
    );
  try {
    let output: Buffer;
    if (workerUrl && token && token.length >= 32) {
      const response = await fetch(new URL("/cutout", workerUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
        },
        body: new Uint8Array(bytes),
        redirect: "error",
        signal: AbortSignal.timeout(120_000),
        cache: "no-store",
      }).catch(() => {
        throw new HeroPreparationError(
          "ارتباط با سرویس حذف زمینهٔ تنظیم‌شده روی سرور برقرار نشد. تصویر فعلی هوم حفظ شد.",
        );
      });
      if (!response.ok)
        throw new HeroPreparationError(
          response.status === 422
            ? "جداسازی این عکس مطمئن نبود. عکس دیگری از محصول انتخاب کنید؛ تصویر فعلی هوم حفظ شد."
            : "سرویس حذف زمینه پاسخ موفق نداد. تصویر فعلی هوم حفظ شد.",
        );
      output = await boundedImageBody(response);
    } else {
      try {
        output = await prepareBuiltinCutout(bytes);
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        throw new HeroPreparationError(
          code === "MODEL_MISSING"
            ? "مدل حذف زمینه هنوز روی سرور آماده نیست. انتشار نسخهٔ جدید در پارس‌پک باید کامل شود؛ نصب روی ویندوز لازم نیست."
            : code === "SERVER_MEMORY"
              ? "حافظهٔ آزاد سرور برای حذف زمینه کافی نیست. منابع سرور را بررسی کنید یا یک PNG شفاف در عکس‌های محصول بارگذاری و انتخاب کنید. تصویر فعلی هوم حفظ شد."
              : code === "PROCESSING_TIMEOUT"
                ? "آماده‌سازی عکس بیش از حد طول کشید. کمی بعد دوباره تلاش کنید یا عکس کوچک‌تری انتخاب کنید. تصویر فعلی هوم حفظ شد."
                : "جداسازی عکس انجام نشد. عکس واضح دیگری انتخاب کنید؛ اگر تکرار شد، گزارش اجرای سرور را بررسی کنید. تصویر فعلی هوم حفظ شد.",
        );
      }
    }
    const prepared = sharp(output, {
      limitInputPixels: 4_000_000,
      failOn: "error",
    });
    const info = await prepared.metadata();
    if (
      info.format !== "png" ||
      !info.hasAlpha ||
      !info.width ||
      !info.height ||
      info.width > 1600 ||
      info.height > 1600
    )
      throw new HeroPreparationError("خروجی شفاف معتبر دریافت نشد.");
    const alpha = (await prepared.stats()).channels[3];
    if (!alpha || alpha.min !== 0 || alpha.max < 200)
      throw new HeroPreparationError("کیفیت جداسازی زمینه قابل قبول نبود.");
    const asset = await prisma.heroCutout.upsert({
      where: { sourcePipeline: key },
      update: {},
      create: {
        ...key,
        sourceImageUrl: image.imageUrl,
        bytes: new Uint8Array(output),
        width: info.width,
        height: info.height,
      },
      select: { id: true },
    });
    return { id: asset.id, imageUrl: `/api/media/hero/${asset.id}` };
  } finally {
    await releaseCronLease("hero-cutout", lease.holder).catch(() => undefined);
  }
}
