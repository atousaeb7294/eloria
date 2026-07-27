import "dotenv/config";

import {
  PrismaPg,
} from "@prisma/adapter-pg";

import {
  PrismaClient,
} from "@/generated/prisma/client";

const globalForPrisma =
  globalThis as unknown as {
    prisma:
      | PrismaClient
      | undefined;
  };

/**
 * دریافت آدرس دیتابیس از متغیر محیطی.
 */
function getDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "متغیر DATABASE_URL در فایل .env تنظیم نشده است.",
    );
  }

  return databaseUrl;
}

/**
 * آماده‌سازی آدرس دیتابیس برای اتصال Runtime.
 *
 * تنظیمات SSL از URL حذف می‌شوند و مستقیماً
 * در PrismaPg اعمال خواهند شد.
 */
function getRuntimeDatabaseUrl(): string {
  const databaseUrl =
    getDatabaseUrl();

  let parsedUrl: URL;

  try {
    parsedUrl =
      new URL(databaseUrl);
  } catch {
    throw new Error(
      "ساختار DATABASE_URL معتبر نیست.",
    );
  }

  const sslParameters = [
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
    "sslidentity",
    "sslpassword",
    "sslaccept",
  ];

  for (
    const parameter of
    sslParameters
  ) {
    parsedUrl.searchParams.delete(
      parameter,
    );
  }

  return parsedUrl.toString();
}

/**
 * ساخت Prisma Client با Connection Pool محدود.
 */
function createPrismaClient(): PrismaClient {
  const adapter =
    new PrismaPg({
      connectionString:
        getRuntimeDatabaseUrl(),

      /**
       * اتصال رمزگذاری‌شده به Supabase.
       */
      ssl: {
        rejectUnauthorized:
          false,
      },

      /**
       * حداکثر تعداد اتصال هم‌زمان.
       *
       * مقدار کم، از پرشدن ظرفیت Supabase Pooler
       * جلوگیری می‌کند.
       */
      max: 2,

      /**
       * حداکثر زمان انتظار برای ایجاد اتصال جدید.
       */
      connectionTimeoutMillis:
        60_000,

      /**
       * اتصال بدون استفاده پس از ۳۰ ثانیه آزاد شود.
       */
      idleTimeoutMillis:
        30_000,

      /**
       * زنده نگه‌داشتن اتصال TCP.
       */
      keepAlive: true,

      keepAliveInitialDelayMillis:
        10_000,

      /**
       * نام اتصال برای تشخیص در Supabase.
       */
      application_name:
        "neweloria",
    });

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

/**
 * در حالت Development فقط یک Prisma Client
 * و یک Connection Pool ساخته می‌شود.
 */
export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalForPrisma.prisma =
    prisma;
}