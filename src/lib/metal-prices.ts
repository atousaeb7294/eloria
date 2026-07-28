import {
  getMetalRateFreshness,
} from "@/lib/metal-rate-freshness";

import {
  getMetalRateSaleDecision,
} from "@/lib/metal-rate-sale-policy";

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
  const defaultStaleAfterMinutes =
    getStaleAfterMinutes();

  const now =
    new Date();

  const [
    prices,
    policies,
  ] = await Promise.all([
    prisma.metalPrice.findMany({
      orderBy: {
        material:
          "asc",
      },
    }),

    prisma.pricingPolicy.findMany({
      where: {
        isActive:
          true,
      },
    }),
  ]);

  const policyByMaterial =
    new Map(
      policies.map(
        (policy) => [
          policy.material,
          policy,
        ],
      ),
    );

  return {
    staleAfterMinutes:
      defaultStaleAfterMinutes,

    prices: prices.map(
      (price) => {
        const policy =
          policyByMaterial.get(
            price.material,
          );

        const staleAfterMinutes =
          policy?.staleAfterMinutes ??
          defaultStaleAfterMinutes;

        /*
         * اعتبار نرخ بر اساس زمان واقعی بازار محاسبه می‌شود،
         * نه زمان دریافت موفق پاسخ API.
         */
        const freshness =
          getMetalRateFreshness({
            sourceTimeUnix:
              price.sourceTimeUnix,

            staleAfterMinutes,

            now,
          });

        /*
         * نرخ منقضی فقط در صورت فعال‌بودن سیاست بازار بسته
         * و قرارداشتن در سقف زمانی مجاز قابل فروش است.
         */
        const saleDecision =
          getMetalRateSaleDecision({
            referencePricePerGramToman:
              price.pricePerGram.toString(),

            freshness,

            closedMarketPricingEnabled:
              policy
                ?.closedMarketPricingEnabled ??
              false,

            closedMarketMaxAgeMinutes:
              policy
                ?.closedMarketMaxAgeMinutes ??
              0,

            closedMarketSafetyMarginPercent:
              policy
                ?.closedMarketSafetyMarginPercent
                .toString() ??
              "0",
          });

        return {
          material:
            price.material,

          pricePerGramToman:
            price.pricePerGram.toString(),

          effectivePricePerGramToman:
            saleDecision
              .effectivePricePerGramToman,

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

          sourceTimeUnix:
            price.sourceTimeUnix
              ?.toString() ??
            null,

          marketTimestamp:
            freshness.marketTimestamp
              ?.toISOString() ??
            null,

          fetchedAt:
            price.fetchedAt.toISOString(),

          lastSuccessAt:
            price.lastSuccessAt.toISOString(),

          ageSeconds:
            freshness.ageSeconds,

          isStale:
            freshness.isStale,

          freshnessReason:
            freshness.reason,

          staleAfterMinutes,

          hasPricingPolicy:
            Boolean(
              policy,
            ),

          closedMarketPricingEnabled:
            policy
              ?.closedMarketPricingEnabled ??
            false,

          closedMarketMaxAgeMinutes:
            policy
              ?.closedMarketMaxAgeMinutes ??
            0,

          closedMarketSafetyMarginPercent:
            policy
              ?.closedMarketSafetyMarginPercent
              .toString() ??
            "0",

          saleMode:
            saleDecision.mode,

          saleReason:
            saleDecision.reason,

          isUsableForSale:
            saleDecision
              .isUsableForSale,

          appliedSafetyMarginPercent:
            saleDecision
              .appliedSafetyMarginPercent,

          safetyMarginAmountToman:
            saleDecision
              .safetyMarginAmountToman,

          lastError:
            price.lastError,
        };
      },
    ),
  };
}