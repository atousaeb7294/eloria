import { prisma } from "@/lib/prisma";

export function getStaleAfterMinutes() {
  const configuredValue = Number(
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

  const staleAfterMilliseconds =
    staleAfterMinutes * 60 * 1000;

  const now = Date.now();

  const prices =
    await prisma.metalPrice.findMany({
      orderBy: {
        material: "asc",
      },
    });

  return {
    staleAfterMinutes,

    prices: prices.map((price) => {
      const ageMilliseconds =
        now -
        price.lastSuccessAt.getTime();

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

        sourceTimeUnix:
          price.sourceTimeUnix?.toString() ??
          null,

        fetchedAt:
          price.fetchedAt.toISOString(),

        lastSuccessAt:
          price.lastSuccessAt.toISOString(),

        ageSeconds: Math.max(
          0,
          Math.floor(
            ageMilliseconds / 1000,
          ),
        ),

        isStale:
          ageMilliseconds >
          staleAfterMilliseconds,

        lastError:
          price.lastError,
      };
    }),
  };
}