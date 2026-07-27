import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * آدرس اصلی دیتابیس را از متغیر محیطی دریافت می‌کند.
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
 * پارامترهای SSL داخل Connection String می‌توانند
 * تنظیم ssl در pg را بازنویسی کنند.
 *
 * بنابراین آن‌ها را از نسخه Runtime آدرس حذف می‌کنیم
 * و SSL را مستقیماً در PrismaPg تنظیم می‌کنیم.
 */
function getRuntimeDatabaseUrl(): string {
  const databaseUrl = getDatabaseUrl();

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
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

  for (const parameter of sslParameters) {
    parsedUrl.searchParams.delete(
      parameter,
    );
  }

  return parsedUrl.toString();
}

/**
 * یک Prisma Client با Connection Pool محدود و
 * مناسب Supabase Session Pooler می‌سازد.
 */
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString:
      getRuntimeDatabaseUrl(),

    /*
     * Supabase از TLS استفاده می‌کند.
     *
     * در محیط توسعه فعلی اعتبارسنجی زنجیره گواهی
     * غیرفعال شده تا خطای self-signed certificate
     * ایجاد نشود.
     */
    ssl: {
      rejectUnauthorized: false,
    },

    /*
     * تعداد اتصال محدود برای جلوگیری از
     * اشغال ظرفیت Supabase Session Pooler.
     */
    max: 2,

    /*
     * حداکثر زمان انتظار برای ایجاد اتصال.
     */
    connectionTimeoutMillis: 60_000,

    /*
     * اتصال بلااستفاده پس از ۳۰ ثانیه آزاد شود.
     */
    idleTimeoutMillis: 30_000,

    /*
     * حفظ اتصال TCP در زمان بیکاری کوتاه.
     */
    keepAlive: true,

    keepAliveInitialDelayMillis: 10_000,

    /*
     * حداکثر زمان اجرای Query و Statement.
     */
    query_timeout: 60_000,

    statement_timeout: 60_000,

    application_name: "neweloria",
  });

  return new PrismaClient({
    adapter,

    log:
      process.env.NODE_ENV ===
      "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

/*
 * هنگام Hot Reload در Next.js فقط یک
 * PrismaClient و یک Connection Pool باقی می‌ماند.
 */
if (
  process.env.NODE_ENV !== "production"
) {
  globalForPrisma.prisma = prisma;
}