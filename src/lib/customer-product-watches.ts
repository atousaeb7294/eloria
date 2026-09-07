import { Prisma } from "@/generated/prisma/client";

import { getProductDisplayPrice } from "@/lib/product-pricing";
import { prisma, withDatabaseRetry } from "@/lib/prisma";

export function isCustomerProductWatchesEnabled(): boolean {
  const value = process.env.ELORIA_CUSTOMER_WATCHES_ENABLED?.trim().toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return process.env.NODE_ENV !== "production";
}

function validSlug(value: string): string | null {
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,139}$/.test(slug) ? slug : null;
}

export async function getCustomerProductWatch(customerId: string, slug: string) {
  const normalizedSlug = validSlug(slug);
  if (!normalizedSlug) return null;

  return prisma.customerProductWatch.findFirst({
    where: {
      customerId,
      product: { slug: normalizedSlug },
    },
    select: {
      id: true,
      notifyOnPriceDrop: true,
      notifyOnRestock: true,
      lastObservedPriceToman: true,
      lastObservedInStock: true,
      updatedAt: true,
    },
  });
}

export async function getCustomerProductWatches(customerId: string) {
  return prisma.customerProductWatch.findMany({
    where: { customerId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      notifyOnPriceDrop: true,
      notifyOnRestock: true,
      lastObservedPriceToman: true,
      lastObservedInStock: true,
      createdAt: true,
      updatedAt: true,
      product: {
        select: {
          slug: true,
          nameFa: true,
          nameEn: true,
          status: true,
          images: {
            orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
            take: 1,
            select: { imageUrl: true },
          },
        },
      },
    },
  });
}

export async function addCustomerProductWatch(customerId: string, slug: string) {
  const normalizedSlug = validSlug(slug);
  if (!normalizedSlug) throw new Error("محصول معتبر نیست.");

  const product = await prisma.product.findFirst({
    where: {
      slug: normalizedSlug,
      status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
      collection: { isActive: true },
    },
    select: { id: true },
  });
  if (!product) throw new Error("این محصول برای پیگیری در دسترس نیست.");

  return prisma.customerProductWatch.upsert({
    where: {
      customerId_productId: {
        customerId,
        productId: product.id,
      },
    },
    create: {
      customerId,
      productId: product.id,
      notifyOnPriceDrop: true,
      notifyOnRestock: true,
    },
    update: {
      notifyOnPriceDrop: true,
      notifyOnRestock: true,
    },
    select: {
      id: true,
      notifyOnPriceDrop: true,
      notifyOnRestock: true,
      lastObservedPriceToman: true,
      lastObservedInStock: true,
      updatedAt: true,
    },
  });
}

export async function removeCustomerProductWatch(customerId: string, slug: string) {
  const normalizedSlug = validSlug(slug);
  if (!normalizedSlug) throw new Error("محصول معتبر نیست.");

  const deleted = await prisma.customerProductWatch.deleteMany({
    where: {
      customerId,
      product: { slug: normalizedSlug },
    },
  });
  return deleted.count > 0;
}

function productInStock(input: {
  status: "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";
  stock: number;
  variants: Array<{ stock: number; isActive: boolean }>;
}): boolean {
  if (input.status !== "ACTIVE") return false;
  if (input.variants.length === 0) return input.stock > 0;
  return input.variants.some((variant) => variant.isActive && variant.stock > 0);
}

function priceText(value: Prisma.Decimal | null): string {
  if (!value) return "—";
  return new Intl.NumberFormat("fa-IR").format(Number(value.toString()));
}

export type CustomerProductWatchRunResult = {
  checked: number;
  priceDropNotifications: number;
  restockNotifications: number;
  priceUnavailable: number;
};

export async function runCustomerProductWatches(
  now = new Date(),
): Promise<CustomerProductWatchRunResult> {
  if (!isCustomerProductWatchesEnabled()) {
    return {
      checked: 0,
      priceDropNotifications: 0,
      restockNotifications: 0,
      priceUnavailable: 0,
    };
  }

  const watches = await withDatabaseRetry(() =>
    prisma.customerProductWatch.findMany({
      where: {
        product: {
          status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
          collection: { isActive: true },
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 500,
      include: {
        product: {
          select: {
            slug: true,
            nameFa: true,
            nameEn: true,
            status: true,
            stock: true,
            variants: {
              select: { stock: true, isActive: true },
            },
          },
        },
      },
    }),
  );

  let priceDropNotifications = 0;
  let restockNotifications = 0;
  let priceUnavailable = 0;

  for (const watch of watches) {
    const inStock = productInStock(watch.product);
    let observedPrice: Prisma.Decimal | null = null;

    try {
      const quote = await getProductDisplayPrice({ slug: watch.product.slug });
      observedPrice = new Prisma.Decimal(quote.pricing.finalPriceToman);
    } catch {
      priceUnavailable += 1;
    }

    const priceDropped =
      watch.notifyOnPriceDrop &&
      watch.lastObservedPriceToman !== null &&
      observedPrice !== null &&
      observedPrice.lessThan(watch.lastObservedPriceToman);
    const restocked =
      watch.notifyOnRestock &&
      watch.lastObservedInStock === false &&
      inStock;

    await prisma.$transaction(async (transaction) => {
      if (priceDropped && observedPrice && watch.lastObservedPriceToman) {
        await transaction.customerNotification.create({
          data: {
            customerId: watch.customerId,
            type: "PRODUCT_PRICE_DROP",
            titleFa: "قیمت محصول پیگیری‌شده کاهش یافت",
            titleEn: "A watched product price dropped",
            bodyFa: `قیمت «${watch.product.nameFa}» از ${priceText(watch.lastObservedPriceToman)} به ${priceText(observedPrice)} تومان رسید.`,
            bodyEn: `The current displayed price for ${watch.product.nameEn} decreased from ${priceText(watch.lastObservedPriceToman)} to ${priceText(observedPrice)} Toman.`,
          },
        });
      }

      if (restocked) {
        await transaction.customerNotification.create({
          data: {
            customerId: watch.customerId,
            type: "PRODUCT_RESTOCK",
            titleFa: "محصول پیگیری‌شده دوباره موجود شد",
            titleEn: "A watched product is back in stock",
            bodyFa: `«${watch.product.nameFa}» دوباره برای بررسی و سفارش در دسترس است. موجودی نهایی هنگام ثبت سفارش تأیید می‌شود.`,
            bodyEn: `${watch.product.nameEn} is available to review and order again. Final availability is confirmed at checkout.`,
          },
        });
      }

      await transaction.customerProductWatch.update({
        where: { id: watch.id },
        data: {
          lastObservedPriceToman: observedPrice ?? watch.lastObservedPriceToman,
          lastObservedInStock: inStock,
          lastNotifiedAt: priceDropped || restocked ? now : watch.lastNotifiedAt,
        },
      });
    });

    if (priceDropped) priceDropNotifications += 1;
    if (restocked) restockNotifications += 1;
  }

  return {
    checked: watches.length,
    priceDropNotifications,
    restockNotifications,
    priceUnavailable,
  };
}
