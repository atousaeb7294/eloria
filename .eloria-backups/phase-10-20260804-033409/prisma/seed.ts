import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error(
    "متغیر DATABASE_URL در فایل .env تعریف نشده است.",
  );
}

const databaseUrl = new URL(rawDatabaseUrl);

const databaseName =
  decodeURIComponent(
    databaseUrl.pathname.replace(/^\/+/, ""),
  ) || "postgres";

const adapter = new PrismaPg({
  host: databaseUrl.hostname,

  port: Number(
    databaseUrl.port || "5432",
  ),

  user: decodeURIComponent(
    databaseUrl.username,
  ),

  password: decodeURIComponent(
    databaseUrl.password,
  ),

  database: databaseName,

  ssl: {
    rejectUnauthorized: false,
  },

  connectionTimeoutMillis: 30_000,

  max: 3,
});

const prisma = new PrismaClient({
  adapter,
});

const collections = [
  {
    slug: "necklaces",
    nameFa: "گردنبند",
    nameEn: "Necklaces",

    descriptionFa:
      "گردنبندهایی با فرم‌های ظریف، بافت‌های اصیل و جزئیاتی الهام‌گرفته از هنر ایرانی.",

    descriptionEn:
      "Delicate necklaces featuring handcrafted textures and details inspired by Persian art.",

    imageUrl:
      "/images/collections/necklaces.jfif",

    displayOrder: 1,
    isActive: true,
  },

  {
    slug: "bracelets",
    nameFa: "دستبند",
    nameEn: "Bracelets",

    descriptionFa:
      "ترکیبی از بافت دست‌ساز، طلا و طراحی متناسب با استایل‌های روزمره و خاص.",

    descriptionEn:
      "A combination of handmade weaving, gold and designs created for everyday and distinctive styles.",

    imageUrl:
      "/images/collections/bracelet.jpg",

    displayOrder: 2,
    isActive: true,
  },

  {
    slug: "earrings",
    nameFa: "گوشواره",
    nameEn: "Earrings",

    descriptionFa:
      "گوشواره‌هایی سبک و متمایز با فرم‌هایی که برای درخشیدن در لحظه‌های مهم طراحی شده‌اند.",

    descriptionEn:
      "Lightweight statement earrings designed to shine through meaningful moments.",

    imageUrl:
      "/images/collections/earring.jpg",

    displayOrder: 3,
    isActive: true,
  },
];

async function main() {
  console.log(
    "در حال اتصال به دیتابیس...",
  );

  for (const collection of collections) {
    await prisma.collection.upsert({
      where: {
        slug: collection.slug,
      },

      update: {
        nameFa: collection.nameFa,
        nameEn: collection.nameEn,

        descriptionFa:
          collection.descriptionFa,

        descriptionEn:
          collection.descriptionEn,

        imageUrl:
          collection.imageUrl,

        displayOrder:
          collection.displayOrder,

        isActive:
          collection.isActive,
      },

      create: {
        slug: collection.slug,

        nameFa:
          collection.nameFa,

        nameEn:
          collection.nameEn,

        descriptionFa:
          collection.descriptionFa,

        descriptionEn:
          collection.descriptionEn,

        imageUrl:
          collection.imageUrl,

        displayOrder:
          collection.displayOrder,

        isActive:
          collection.isActive,
      },
    });

    console.log(
      `کالکشن «${collection.nameFa}» ثبت شد.`,
    );
  }

  console.log(
    "سه کالکشن اصلی با موفقیت در دیتابیس ثبت شدند.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      "خطا در ثبت داده‌های اولیه:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });