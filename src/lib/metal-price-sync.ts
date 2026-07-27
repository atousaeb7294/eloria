import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import {
  fetchBrsMetalRates,
  type FetchedMetalRate,
} from "@/lib/brs-market";
import { prisma } from "@/lib/prisma";

type SavedMetalRate = {
  material: FetchedMetalRate["material"];
  pricePerGramToman: number;
  referencePurity: number;
  sourceSymbol: string;
  sourceDate: string | null;
  sourceTime: string | null;
};

/**
 * برای جلوگیری از ثبت چندباره یک نرخ یکسان در تاریخچه.
 *
 * fingerprint بر اساس این موارد ساخته می‌شود:
 * - نوع فلز
 * - منبع
 * - نماد
 * - زمان نرخ در منبع
 * - قیمت
 * - عیار مرجع
 */
function createFingerprint(
  rate: FetchedMetalRate,
): string {
  const sourceMoment =
    rate.sourceTimeUnix ??
    `${rate.sourceDate ?? ""}-${rate.sourceTime ?? ""}`;

  return createHash("sha256")
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
    .digest("hex");
}

/**
 * داده دریافتی از سرویس خارجی را به JSON سازگار با Prisma تبدیل می‌کند.
 *
 * JSON.stringify مقادیر ناسازگار مانند undefined را حذف می‌کند
 * و JSON.parse یک ساختار JSON خالص می‌سازد.
 */
function normalizeJson(
  value: Record<string, unknown>,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}

function toNullableBigInt(
  value: number | null,
): bigint | null {
  if (value === null) {
    return null;
  }

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return null;
  }

  return BigInt(value);
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message.slice(
      0,
      1000,
    );
  }

  return "خطای ناشناخته در دریافت یا ذخیره نرخ";
}

/**
 * یک نرخ طلا یا نقره را ذخیره می‌کند.
 *
 * از تراکنش تعاملی استفاده نمی‌شود تا روی
 * Supabase Session Pooler خطای P2028 ایجاد نشود.
 */
async function saveSingleRate(
  rate: FetchedMetalRate,
  fetchedAt: Date,
): Promise<SavedMetalRate> {
  const rawPayload = normalizeJson(
    rate.rawPayload,
  );

  /*
   * نرخ جاری هر فلز فقط یک رکورد دارد.
   * material در دیتابیس unique است.
   */
  const currentRate =
    await prisma.metalPrice.upsert({
      where: {
        material: rate.material,
      },

      update: {
        pricePerGram: String(
          rate.pricePerGramToman,
        ),

        referencePurity:
          rate.referencePurity,

        currency: "TOMAN",

        source: rate.source,

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

        lastSuccessAt: fetchedAt,

        lastError: null,

        rawPayload,
      },

      create: {
        material: rate.material,

        pricePerGram: String(
          rate.pricePerGramToman,
        ),

        referencePurity:
          rate.referencePurity,

        currency: "TOMAN",

        source: rate.source,

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

        lastSuccessAt: fetchedAt,

        lastError: null,

        rawPayload,
      },
    });

  const fingerprint =
    createFingerprint(rate);

  /*
   * یک نرخ با قیمت و زمان یکسان فقط یک بار
   * در جدول تاریخچه ثبت می‌شود.
   */
  await prisma.metalPriceHistory.upsert({
    where: {
      fingerprint,
    },

    /*
     * هنگام دریافت دوباره همان نرخ، تاریخچه قبلی
     * دست‌نخورده باقی می‌ماند.
     */
    update: {},

    create: {
      metalPriceId:
        currentRate.id,

      material:
        rate.material,

      pricePerGram: String(
        rate.pricePerGramToman,
      ),

      referencePurity:
        rate.referencePurity,

      currency: "TOMAN",

      source: rate.source,

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
  };
}

/**
 * آخرین نرخ طلا و نقره را از BRS دریافت می‌کند،
 * نرخ جاری را به‌روزرسانی می‌کند و تغییرات را
 * در جدول تاریخچه ثبت می‌کند.
 */
export async function syncMetalPrices(): Promise<
  SavedMetalRate[]
> {
  try {
    const rates =
      await fetchBrsMetalRates();

    if (!Array.isArray(rates)) {
      throw new Error(
        "ساختار نرخ‌های دریافتی از BRS معتبر نیست.",
      );
    }

    if (rates.length === 0) {
      throw new Error(
        "هیچ نرخ معتبری از سرویس BRS دریافت نشد.",
      );
    }

    const fetchedAt = new Date();

    const savedRates: SavedMetalRate[] =
      [];

    /*
     * ذخیره ترتیبی است تا فشار هم‌زمان روی
     * Connection Pool دیتابیس ایجاد نشود.
     */
    for (const rate of rates) {
      if (
        !Number.isFinite(
          rate.pricePerGramToman,
        ) ||
        rate.pricePerGramToman <= 0
      ) {
        throw new Error(
          `نرخ ${rate.material} معتبر نیست.`,
        );
      }

      if (
        !Number.isInteger(
          rate.referencePurity,
        ) ||
        rate.referencePurity <= 0 ||
        rate.referencePurity > 1000
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

      savedRates.push(savedRate);
    }

    return savedRates;
  } catch (error) {
    const errorMessage =
      getErrorMessage(error);

    /*
     * خطای آخر برای کنترل سلامت نرخ‌ها ذخیره می‌شود.
     * خطای ثبت این پیام نباید خطای اصلی را مخفی کند.
     */
    await prisma.metalPrice
      .updateMany({
        data: {
          lastError: errorMessage,
        },
      })
      .catch(() => undefined);

    throw error;
  }
}