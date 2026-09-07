import {
  getMetalRateFreshness,
} from "@/lib/metal-rate-freshness";

import {
  getMetalRateSaleDecision,
} from "@/lib/metal-rate-sale-policy";

import {
  prisma,
  withDatabaseRetry,
} from "@/lib/prisma";

type MetalPriceRecord =
  Awaited<
    ReturnType<
      typeof prisma.metalPrice.findMany
    >
  >[number];

type PricingPolicyRecord =
  Awaited<
    ReturnType<
      typeof prisma.pricingPolicy.findMany
    >
  >[number];

type MetalPriceRecords = {
  prices:
    MetalPriceRecord[];

  policies:
    PricingPolicyRecord[];
};

type MetalPriceCache = {
  records:
    MetalPriceRecords | null;

  freshUntil:
    number;

  staleUntil:
    number;

  inFlight:
    Promise<MetalPriceRecords> | null;
};

type MetalPriceGlobal =
  typeof globalThis & {
    __eloriaMetalPriceCache?:
      MetalPriceCache;
  };

const metalPriceGlobal =
  globalThis as MetalPriceGlobal;

const metalPriceCache:
  MetalPriceCache =
    metalPriceGlobal
      .__eloriaMetalPriceCache ??
    {
      records:
        null,

      freshUntil:
        0,

      staleUntil:
        0,

      inFlight:
        null,
    };

metalPriceGlobal.__eloriaMetalPriceCache =
  metalPriceCache;

function getIntegerSetting({
  name,
  fallback,
  minimum,
  maximum,
}: {
  name: string;
  fallback: number;
  minimum: number;
  maximum: number;
}): number {
  const value =
    Number.parseInt(
      process.env[name] ?? "",
      10,
    );

  if (
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.min(
    Math.max(
      value,
      minimum,
    ),
    maximum,
  );
}

export function getStaleAfterMinutes(): number {
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

function getReadCacheMilliseconds(): number {
  return getIntegerSetting({
    name:
      "METAL_PRICE_READ_CACHE_MS",

    fallback:
      5_000,

    minimum:
      1_000,

    maximum:
      60_000,
  });
}

function getFallbackCacheMilliseconds(): number {
  return getIntegerSetting({
    name:
      "METAL_PRICE_READ_STALE_FALLBACK_MS",

    fallback:
      60_000,

    minimum:
      5_000,

    maximum:
      300_000,
  });
}

async function loadMetalPriceRecords():
  Promise<MetalPriceRecords> {
  const prices =
    await withDatabaseRetry(
      () =>
        prisma.metalPrice.findMany({
      orderBy: {
        material:
          "asc",
      },
    }),
      {
        attempts: 2,
        delayMilliseconds: 200,
      },
    );

  const policies =
    await withDatabaseRetry(
      () =>
        prisma.pricingPolicy.findMany({
      where: {
        isActive:
          true,
      },
    }),
      {
        attempts: 2,
        delayMilliseconds: 200,
      },
    );

  return {
    prices,
    policies,
  };
}

async function getMetalPriceRecords():
  Promise<MetalPriceRecords> {
  const now =
    Date.now();

  if (
    metalPriceCache.records &&
    metalPriceCache.freshUntil >
      now
  ) {
    return metalPriceCache.records;
  }

  if (
    metalPriceCache.inFlight
  ) {
    return metalPriceCache.inFlight;
  }

  const request =
    (async () => {
      try {
        const records =
          await loadMetalPriceRecords();

        const storedAt =
          Date.now();

        metalPriceCache.records =
          records;

        metalPriceCache.freshUntil =
          storedAt +
          getReadCacheMilliseconds();

        metalPriceCache.staleUntil =
          storedAt +
          getFallbackCacheMilliseconds();

        return records;
      } catch (error) {
        if (
          metalPriceCache.records &&
          metalPriceCache.staleUntil >
            Date.now()
        ) {
          console.warn(
            "[Eloria Metal Prices] Database unavailable; using temporary cached records.",
            error,
          );

          return metalPriceCache.records;
        }

        throw error;
      } finally {
        metalPriceCache.inFlight =
          null;
      }
    })();

  metalPriceCache.inFlight =
    request;

  return request;
}

export function invalidateMetalPriceReadCache():
  void {
  metalPriceCache.records =
    null;

  metalPriceCache.freshUntil =
    0;

  metalPriceCache.staleUntil =
    0;
}

export async function getMetalPriceSnapshot() {
  const defaultStaleAfterMinutes =
    getStaleAfterMinutes();

  const {
    prices,
    policies,
  } =
    await getMetalPriceRecords();

  const now =
    new Date();

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

    prices:
      prices.map(
        (price) => {
          const policy =
            policyByMaterial.get(
              price.material,
            );

          const staleAfterMinutes =
            policy
              ?.staleAfterMinutes ??
            defaultStaleAfterMinutes;

          const freshness =
            getMetalRateFreshness({
              sourceTimeUnix:
                price.sourceTimeUnix,

              staleAfterMinutes,

              now,
            });

          const saleDecision =
            getMetalRateSaleDecision({
              material:
                price.material,

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