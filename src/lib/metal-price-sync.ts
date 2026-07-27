import {
  createHash,
} from "node:crypto";

import type {
  Prisma,
} from "@/generated/prisma/client";

import {
  fetchBrsMetalRates,
  type FetchedMetalRate,
} from "@/lib/brs-market";

import {
  prisma,
} from "@/lib/prisma";

type SavedMetalRate = {
  material:
    FetchedMetalRate["material"];

  pricePerGramToman:
    number;

  referencePurity:
    number;

  sourceSymbol:
    string;

  sourceDate:
    string | null;

  sourceTime:
    string | null;

  sourceTimeUnix:
    number | null;

  appliedToCurrent:
    boolean;

  writeReason:
    CurrentRateWriteReason;
};

type ComparableSourceTimeUnix =
  | number
  | bigint
  | null
  | undefined;

export type CurrentRateWriteReason =
  | "CURRENT_TIMESTAMP_MISSING"
  | "BOTH_TIMESTAMPS_MISSING"
  | "INCOMING_TIMESTAMP_MISSING"
  | "INCOMING_IS_OLDER"
  | "INCOMING_IS_NEWER_OR_EQUAL";

export type CurrentRateWriteDecision = {
  applyIncoming:
    boolean;

  reason:
    CurrentRateWriteReason;
};

const UNIX_MILLISECONDS_THRESHOLD =
  BigInt(
    100_000_000_000,
  );

const MILLISECONDS_PER_SECOND =
  BigInt(
    1000,
  );

const MAXIMUM_CONCURRENT_WRITE_ATTEMPTS =
  3;

/**
 * timestampهای ثانیه‌ای و میلی‌ثانیه‌ای
 * را برای مقایسه به میلی‌ثانیه تبدیل می‌کند.
 */
function normalizeSourceTimeUnixToMilliseconds(
  value:
    ComparableSourceTimeUnix,
): bigint | null {
  let normalizedValue:
    bigint;

  if (
    typeof value ===
    "bigint"
  ) {
    normalizedValue =
      value;
  } else if (
    typeof value ===
      "number" &&
    Number.isSafeInteger(
      value,
    )
  ) {
    normalizedValue =
      BigInt(
        value,
      );
  } else {
    return null;
  }

  if (
    normalizedValue <=
    BigInt(0)
  ) {
    return null;
  }

  if (
    normalizedValue >=
    UNIX_MILLISECONDS_THRESHOLD
  ) {
    return normalizedValue;
  }

  return (
    normalizedValue *
    MILLISECONDS_PER_SECOND
  );
}

/**
 * تعیین می‌کند نرخ دریافتی جدید اجازه دارد
 * رکورد جاری دیتابیس را جایگزین کند یا نه.
 *
 * قوانین:
 *
 * - نرخ قدیمی‌تر هرگز نرخ جدیدتر را بازنویسی نمی‌کند.
 * - نرخ بدون timestamp جای نرخ timestampدار را نمی‌گیرد.
 * - نرخ timestampدار می‌تواند رکورد بدون timestamp را اصلاح کند.
 * - timestamp برابر مجاز است؛ چون ممکن است قیمت همان لحظه اصلاح شده باشد.
 */
export function decideCurrentRateWrite({
  currentSourceTimeUnix,
  incomingSourceTimeUnix,
}: {
  currentSourceTimeUnix:
    ComparableSourceTimeUnix;

  incomingSourceTimeUnix:
    ComparableSourceTimeUnix;
}): CurrentRateWriteDecision {
  const currentTimestamp =
    normalizeSourceTimeUnixToMilliseconds(
      currentSourceTimeUnix,
    );

  const incomingTimestamp =
    normalizeSourceTimeUnixToMilliseconds(
      incomingSourceTimeUnix,
    );

  if (
    currentTimestamp ===
      null &&
    incomingTimestamp ===
      null
  ) {
    return {
      applyIncoming:
        true,

      reason:
        "BOTH_TIMESTAMPS_MISSING",
    };
  }

  if (
    currentTimestamp ===
    null
  ) {
    return {
      applyIncoming:
        true,

      reason:
        "CURRENT_TIMESTAMP_MISSING",
    };
  }

  if (
    incomingTimestamp ===
    null
  ) {
    return {
      applyIncoming:
        false,

      reason:
        "INCOMING_TIMESTAMP_MISSING",
    };
  }

  if (
    incomingTimestamp <
    currentTimestamp
  ) {
    return {
      applyIncoming:
        false,

      reason:
        "INCOMING_IS_OLDER",
    };
  }

  return {
    applyIncoming:
      true,

    reason:
      "INCOMING_IS_NEWER_OR_EQUAL",
  };
}

/**
 * برای جلوگیری از ثبت چندباره
 * یک نرخ یکسان در تاریخچه.
 */
function createFingerprint(
  rate:
    FetchedMetalRate,
): string {
  const sourceMoment =
    rate.sourceTimeUnix ??
    `${rate.sourceDate ?? ""}-${rate.sourceTime ?? ""}`;

  return createHash(
    "sha256",
  )
    .update(
      [
        rate.material,
        rate.source,
        rate.sourceSymbol,
        sourceMoment,
        rate.pricePerGramToman,
        rate.referencePurity,
      ].join("|"),
    )
    .digest(
      "hex",
    );
}

/**
 * داده API را به JSON سازگار با Prisma
 * تبدیل می‌کند.
 */
function normalizeJson(
  value:
    Record<
      string,
      unknown
    >,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(
      value,
    ),
  ) as Prisma.InputJsonValue;
}

function toNullableBigInt(
  value:
    number | null,
): bigint | null {
  if (
    value ===
    null
  ) {
    return null;
  }

  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <= 0
  ) {
    return null;
  }

  return BigInt(
    value,
  );
}

function getErrorMessage(
  error:
    unknown,
): string {
  if (
    error instanceof
    Error
  ) {
    return error.message.slice(
      0,
      1000,
    );
  }

  return "خطای ناشناخته در دریافت یا ذخیره نرخ";
}

function isUniqueConstraintError(
  error:
    unknown,
): boolean {
  return (
    typeof error ===
      "object" &&
    error !== null &&
    "code" in error &&
    error.code ===
      "P2002"
  );
}

function buildCurrentRateData(
  rate:
    FetchedMetalRate,

  fetchedAt:
    Date,

  rawPayload:
    Prisma.InputJsonValue,
) {
  return {
    pricePerGram:
      String(
        rate.pricePerGramToman,
      ),

    referencePurity:
      rate.referencePurity,

    currency:
      "TOMAN" as const,

    source:
      rate.source,

    sourceSymbol:
      rate.sourceSymbol,

    sourceUnit:
      rate.sourceUnit,

    sourceDate:
      rate.sourceDate,

    sourceTime:
      rate.sourceTime,

    sourceTimeUnix:
      toNullableBigInt(
        rate.sourceTimeUnix,
      ),

    fetchedAt,

    lastSuccessAt:
      fetchedAt,

    lastError:
      null,

    rawPayload,
  };
}

/**
 * نرخ جاری را با کنترل هم‌زمانی ذخیره می‌کند.
 *
 * از تراکنش تعاملی استفاده نمی‌شود تا روی
 * Supabase Session Pooler خطای P2028 ایجاد نشود.
 */
async function saveCurrentRate(
  rate:
    FetchedMetalRate,

  fetchedAt:
    Date,

  rawPayload:
    Prisma.InputJsonValue,
): Promise<{
  metalPriceId:
    string;

  decision:
    CurrentRateWriteDecision;
}> {
  for (
    let attempt = 1;
    attempt <=
    MAXIMUM_CONCURRENT_WRITE_ATTEMPTS;
    attempt += 1
  ) {
    const currentRate =
      await prisma
        .metalPrice
        .findUnique({
          where: {
            material:
              rate.material,
          },

          select: {
            id:
              true,

            sourceTimeUnix:
              true,

            updatedAt:
              true,
          },
        });

    /**
     * هنوز هیچ رکوردی برای این فلز وجود ندارد.
     */
    if (!currentRate) {
      try {
        const createdRate =
          await prisma
            .metalPrice
            .create({
              data: {
                material:
                  rate.material,

                ...buildCurrentRateData(
                  rate,
                  fetchedAt,
                  rawPayload,
                ),
              },

              select: {
                id:
                  true,
              },
            });

        return {
          metalPriceId:
            createdRate.id,

          decision: {
            applyIncoming:
              true,

            reason:
              rate.sourceTimeUnix ===
              null
                ? "BOTH_TIMESTAMPS_MISSING"
                : "CURRENT_TIMESTAMP_MISSING",
          },
        };
      } catch (error) {
        /**
         * ممکن است یک درخواست هم‌زمان
         * همین رکورد را ساخته باشد.
         */
        if (
          isUniqueConstraintError(
            error,
          ) &&
          attempt <
            MAXIMUM_CONCURRENT_WRITE_ATTEMPTS
        ) {
          continue;
        }

        throw error;
      }
    }

    const decision =
      decideCurrentRateWrite({
        currentSourceTimeUnix:
          currentRate.sourceTimeUnix,

        incomingSourceTimeUnix:
          rate.sourceTimeUnix,
      });

    /**
     * پاسخ API موفق بوده اما timestamp آن
     * از نرخ جاری قدیمی‌تر یا نامعتبر است.
     *
     * قیمت و timestamp جاری تغییر نمی‌کنند.
     * فقط زمان آخرین درخواست موفق و خطای قبلی
     * به‌روزرسانی می‌شوند.
     */
    if (
      !decision.applyIncoming
    ) {
      const metadataUpdate =
        await prisma
          .metalPrice
          .updateMany({
            where: {
              id:
                currentRate.id,

              updatedAt:
                currentRate.updatedAt,
            },

            data: {
              lastSuccessAt:
                fetchedAt,

              lastError:
                null,
            },
          });

      /**
       * اگر count صفر باشد، یعنی یک درخواست دیگر
       * رکورد را هم‌زمان تغییر داده است.
       */
      if (
        metadataUpdate.count ===
        0
      ) {
        continue;
      }

      return {
        metalPriceId:
          currentRate.id,

        decision,
      };
    }

    /**
     * timestamp جدیدتر یا برابر است؛
     * نرخ جاری اجازه به‌روزرسانی دارد.
     */
    const currentRateUpdate =
      await prisma
        .metalPrice
        .updateMany({
          where: {
            id:
              currentRate.id,

            updatedAt:
              currentRate.updatedAt,
          },

          data:
            buildCurrentRateData(
              rate,
              fetchedAt,
              rawPayload,
            ),
        });

    if (
      currentRateUpdate.count ===
      0
    ) {
      continue;
    }

    return {
      metalPriceId:
        currentRate.id,

      decision,
    };
  }

  throw new Error(
    `ذخیره نرخ ${rate.material} به‌دلیل تغییر هم‌زمان دیتابیس انجام نشد.`,
  );
}

/**
 * یک نرخ طلا یا نقره را ذخیره می‌کند.
 */
async function saveSingleRate(
  rate:
    FetchedMetalRate,

  fetchedAt:
    Date,
): Promise<SavedMetalRate> {
  const rawPayload =
    normalizeJson(
      rate.rawPayload,
    );

  const currentWrite =
    await saveCurrentRate(
      rate,
      fetchedAt,
      rawPayload,
    );

  const fingerprint =
    createFingerprint(
      rate,
    );

  /**
   * نرخ دریافتی حتی اگر قدیمی‌تر از نرخ جاری باشد،
   * در تاریخچه ثبت می‌شود.
   *
   * این رفتار برای ممیزی و بررسی کیفیت
   * پاسخ‌های منبع خارجی ضروری است.
   */
  await prisma
    .metalPriceHistory
    .upsert({
      where: {
        fingerprint,
      },

      /**
       * هنگام دریافت دوباره همان نرخ،
       * تاریخچه قبلی دست‌نخورده باقی می‌ماند.
       */
      update: {},

      create: {
        metalPriceId:
          currentWrite
            .metalPriceId,

        material:
          rate.material,

        pricePerGram:
          String(
            rate.pricePerGramToman,
          ),

        referencePurity:
          rate.referencePurity,

        currency:
          "TOMAN",

        source:
          rate.source,

        sourceSymbol:
          rate.sourceSymbol,

        sourceUnit:
          rate.sourceUnit,

        sourceDate:
          rate.sourceDate,

        sourceTime:
          rate.sourceTime,

        sourceTimeUnix:
          toNullableBigInt(
            rate.sourceTimeUnix,
          ),

        fetchedAt,

        fingerprint,

        rawPayload,
      },
    });

  return {
    material:
      rate.material,

    pricePerGramToman:
      rate.pricePerGramToman,

    referencePurity:
      rate.referencePurity,

    sourceSymbol:
      rate.sourceSymbol,

    sourceDate:
      rate.sourceDate,

    sourceTime:
      rate.sourceTime,

    sourceTimeUnix:
      rate.sourceTimeUnix,

    appliedToCurrent:
      currentWrite
        .decision
        .applyIncoming,

    writeReason:
      currentWrite
        .decision
        .reason,
  };
}

/**
 * آخرین نرخ طلا و نقره را از BRS دریافت می‌کند.
 *
 * نرخ جاری با محافظت در برابر پاسخ قدیمی‌تر
 * به‌روزرسانی می‌شود و همه پاسخ‌ها در جدول
 * تاریخچه ثبت می‌شوند.
 */
export async function syncMetalPrices(): Promise<
  SavedMetalRate[]
> {
  try {
    const rates =
      await fetchBrsMetalRates();

    if (
      !Array.isArray(
        rates,
      )
    ) {
      throw new Error(
        "ساختار نرخ‌های دریافتی از BRS معتبر نیست.",
      );
    }

    if (
      rates.length ===
      0
    ) {
      throw new Error(
        "هیچ نرخ معتبری از سرویس BRS دریافت نشد.",
      );
    }

    const fetchedAt =
      new Date();

    const savedRates:
      SavedMetalRate[] =
      [];

    /**
     * ذخیره ترتیبی است تا فشار هم‌زمان
     * روی Connection Pool ایجاد نشود.
     */
    for (
      const rate of
      rates
    ) {
      if (
        !Number.isFinite(
          rate.pricePerGramToman,
        ) ||
        rate.pricePerGramToman <=
          0
      ) {
        throw new Error(
          `نرخ ${rate.material} معتبر نیست.`,
        );
      }

      if (
        !Number.isInteger(
          rate.referencePurity,
        ) ||
        rate.referencePurity <=
          0 ||
        rate.referencePurity >
          1000
      ) {
        throw new Error(
          `عیار مرجع ${rate.material} معتبر نیست.`,
        );
      }

      const savedRate =
        await saveSingleRate(
          rate,
          fetchedAt,
        );

      savedRates.push(
        savedRate,
      );
    }

    return savedRates;
  } catch (error) {
    const errorMessage =
      getErrorMessage(
        error,
      );

    /**
     * خطای آخر برای کنترل سلامت نرخ‌ها ذخیره می‌شود.
     * خطای ثبت این پیام نباید خطای اصلی را مخفی کند.
     */
    await prisma
      .metalPrice
      .updateMany({
        data: {
          lastError:
            errorMessage,
        },
      })
      .catch(
        () =>
          undefined,
      );

    throw error;
  }
}