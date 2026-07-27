import {
  getMetalRateFreshness,
} from "@/lib/metal-rate-freshness";

import {
  prisma,
} from "@/lib/prisma";

export function getStaleAfterMinutes() {
  const configuredValue =
    Number(
      process.env
        .METAL_PRICE_STALE_AFTER_MINUTES ??
        "15",
    );

  if (
    !Number.isFinite(
      configuredValue,
    ) ||
    configuredValue <= 0
  ) {
    return 15;
  }

  return configuredValue;
}

export async function getMetalPriceSnapshot() {
  const staleAfterMinutes =
    getStaleAfterMinutes();

  const now =
    new Date();

  const prices =
    await prisma.metalPrice.findMany({
      orderBy: {
        material:
          "asc",
      },
    });

  return {
    staleAfterMinutes,

    prices: prices.map(
      (price) => {
        /**
         * اعتبار نرخ باید بر اساس زمان واقعی بازار
         * محاسبه شود، نه زمان موفقیت درخواست API.
         */
        const freshness =
          getMetalRateFreshness({
            sourceTimeUnix:
              price.sourceTimeUnix,

            staleAfterMinutes,

            now,
          });

        return {
          material:
            price.material,

          pricePerGramToman:
            price.pricePerGram.toString(),

          referencePurity:
            price.referencePurity,

          currency:
            price.currency,

          source:
            price.source,

          sourceSymbol:
            price.sourceSymbol,

          sourceDate:
            price.sourceDate,

          sourceTime:
            price.sourceTime,

          /**
           * timestamp اصلی دریافت‌شده
           * از منبع بازار.
           */
          sourceTimeUnix:
            price.sourceTimeUnix?.toString() ??
            null,

          /**
           * زمان واقعی بازار به فرمت ISO.
           */
          marketTimestamp:
            freshness.marketTimestamp?.toISOString() ??
            null,

          /**
           * زمان اجرای درخواست و دریافت پاسخ API.
           * این فیلد معیار تازگی بازار نیست.
           */
          fetchedAt:
            price.fetchedAt.toISOString(),

          lastSuccessAt:
            price.lastSuccessAt.toISOString(),

          /**
           * سن نرخ براساس sourceTimeUnix.
           * در صورت نبود timestamp معتبر، null است.
           */
          ageSeconds:
            freshness.ageSeconds,

          isStale:
            freshness.isStale,

          freshnessReason:
            freshness.reason,

          lastError:
            price.lastError,
        };
      },
    ),
  };
}