import "dotenv/config";

import {
  PrismaPg,
} from "@prisma/adapter-pg";

import {
  PrismaClient,
} from "@/generated/prisma/client";

import {
  Pool,
} from "pg";

type EloriaDatabaseGlobal =
  typeof globalThis & {
    __eloriaPgPool?:
      Pool;

    __eloriaPrisma?:
      PrismaClient;

    __eloriaDatabaseWarmup?:
      Promise<void>;
  };

const databaseGlobal =
  globalThis as EloriaDatabaseGlobal;

function getIntegerEnvironmentValue({
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
  const rawValue =
    process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue =
    Number.parseInt(
      rawValue,
      10,
    );

  if (
    !Number.isFinite(
      parsedValue,
    )
  ) {
    return fallback;
  }

  return Math.min(
    Math.max(
      parsedValue,
      minimum,
    ),
    maximum,
  );
}

function getDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "متغیر DATABASE_URL تنظیم نشده است.",
    );
  }

  return databaseUrl;
}

function getRuntimeDatabaseUrl(): string {
  const databaseUrl = getDatabaseUrl();
  try {
    return new URL(databaseUrl).toString();
  } catch {
    throw new Error("ساختار DATABASE_URL معتبر نیست.");
  }
}

function databaseSsl(): false | { rejectUnauthorized: boolean } {
  const mode = process.env.DATABASE_SSL_MODE?.trim().toLowerCase();
  if (mode === "disable") return false;
  if (mode === "require") return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

function createPostgresPool():
  Pool {
  const pool =
    new Pool({
      connectionString:
        getRuntimeDatabaseUrl(),

      ssl: databaseSsl(),

      /**
       * در محیط فعلی یک اتصال گرم کافی است.
       * بعداً روی هاست با DATABASE_POOL_MAX
       * قابل افزایش خواهد بود.
       */
      min:
        1,

      max:
        getIntegerEnvironmentValue({
          name:
            "DATABASE_POOL_MAX",

          fallback:
            1,

          minimum:
            1,

          maximum:
            10,
        }),

      /**
       * شبکه کاربر برای اتصال اولیه حدود سه ثانیه
       * زمان نیاز دارد؛ سقف ۳۰ ثانیه از خطاهای
       * موقت اتصال جلوگیری می‌کند.
       */
      connectionTimeoutMillis:
        getIntegerEnvironmentValue({
          name:
            "DATABASE_CONNECTION_TIMEOUT_MS",

          fallback:
            30_000,

          minimum:
            5_000,

          maximum:
            60_000,
        }),

      /**
       * اتصال گرم حداقل ده دقیقه نگهداری می‌شود
       * تا هر بار صفحه مجبور به اتصال مجدد نشود.
       */
      idleTimeoutMillis:
        getIntegerEnvironmentValue({
          name:
            "DATABASE_IDLE_TIMEOUT_MS",

          fallback:
            600_000,

          minimum:
            30_000,

          maximum:
            1_800_000,
        }),

      /**
       * تعویض اجباری دوره‌ای اتصال غیرفعال است.
       */
      maxLifetimeSeconds:
        0,

      keepAlive:
        true,

      keepAliveInitialDelayMillis:
        10_000,

      application_name:
        "neweloria",
    });

  pool.on(
    "error",
    (
      error,
    ) => {
      databaseGlobal
        .__eloriaDatabaseWarmup =
        undefined;

      console.error(
        "[Eloria Database] PostgreSQL idle connection error.",
        error,
      );
    },
  );

  return pool;
}

export const databasePool =
  databaseGlobal
    .__eloriaPgPool ??
  createPostgresPool();

databaseGlobal.__eloriaPgPool =
  databasePool;

function createPrismaClient():
  PrismaClient {
  const adapter =
    new PrismaPg(
      databasePool,
    );

  return new PrismaClient({
    adapter,

    log:
      process.env.NODE_ENV ===
      "development"
        ? [
            "warn",
            "error",
          ]
        : [
            "error",
          ],
  });
}

export const prisma =
  databaseGlobal
    .__eloriaPrisma ??
  createPrismaClient();

databaseGlobal.__eloriaPrisma =
  prisma;

function wait(
  milliseconds:
    number,
): Promise<void> {
  return new Promise(
    (
      resolve,
    ) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

/**
 * یک اتصال واقعی ایجاد می‌کند و SELECT 1 اجرا می‌کند.
 * Prisma و Warmup از همان Pool مشترک استفاده می‌کنند.
 */
function startDatabaseWarmup():
  Promise<void> {
  const warmup =
    databasePool
      .query(
        "SELECT 1",
      )
      .then(
        () =>
          undefined,
      )
      .catch(
        (
          error,
        ) => {
          if (
            databaseGlobal
              .__eloriaDatabaseWarmup ===
            warmup
          ) {
            databaseGlobal
              .__eloriaDatabaseWarmup =
              undefined;
          }

          throw error;
        },
      );

  databaseGlobal
    .__eloriaDatabaseWarmup =
    warmup;

  return warmup;
}

/**
 * اتصال دیتابیس را آماده می‌کند.
 * در خطای موقت اتصال، یک بار دیگر تلاش می‌شود.
 */
export async function ensureDatabaseReady():
  Promise<void> {
  for (
    let attempt =
      1;

    attempt <=
      2;

    attempt +=
      1
  ) {
    try {
      await (
        databaseGlobal
          .__eloriaDatabaseWarmup ??
        startDatabaseWarmup()
      );

      return;
    } catch (error) {
      databaseGlobal
        .__eloriaDatabaseWarmup =
        undefined;

      if (
        attempt ===
        2
      ) {
        throw error;
      }

      await wait(
        500,
      );
    }
  }
}

/**
 * اتصال از زمان بارگذاری ماژول در پس‌زمینه گرم می‌شود.
 * خطا در Console ثبت می‌شود، اما سرور را متوقف نمی‌کند.
 */
void ensureDatabaseReady().catch(
  (
    error,
  ) => {
    console.error(
      "[Eloria Database] Initial database warmup failed.",
      error,
    );
  },
);