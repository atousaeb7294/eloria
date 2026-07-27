import "dotenv/config";

import { prisma } from "../src/lib/prisma";

async function main() {
  const goldPolicy =
    await prisma.pricingPolicy.upsert({
      where: {
        material: "GOLD",
      },

      update: {
        referencePurity: 750,

        defaultProfitPercent: "7",

        defaultTaxPercent: "10",

        // اصل طلای به‌کاررفته مشمول مالیات نیست.
        taxMetalValue: false,

        // اعتبار قیمت قطعی هنگام پرداخت: ۲ دقیقه
        quoteTtlSeconds: 120,

        // نرخ قدیمی‌تر از ۱۵ دقیقه برای پرداخت معتبر نیست.
        staleAfterMinutes: 15,

        // گرد کردن قیمت نهایی به هزار تومان
        roundingStep: 1000,

        isActive: true,
      },

      create: {
        material: "GOLD",

        referencePurity: 750,

        defaultProfitPercent: "7",

        defaultTaxPercent: "10",

        taxMetalValue: false,

        quoteTtlSeconds: 120,

        staleAfterMinutes: 15,

        roundingStep: 1000,

        isActive: true,
      },
    });

  const silverPolicy =
    await prisma.pricingPolicy.upsert({
      where: {
        material: "SILVER",
      },

      update: {
        referencePurity: 999,

        defaultProfitPercent: "7",

        defaultTaxPercent: "10",

        /*
         * سیاست مالیاتی نقره باید مستقل از طلا تعیین شود.
         * تا زمان تأیید نهایی، اصل فلز در محاسبه مالیات
         * وارد نمی‌شود.
         */
        taxMetalValue: false,

        quoteTtlSeconds: 120,

        staleAfterMinutes: 15,

        roundingStep: 1000,

        isActive: true,
      },

      create: {
        material: "SILVER",

        referencePurity: 999,

        defaultProfitPercent: "7",

        defaultTaxPercent: "10",

        taxMetalValue: false,

        quoteTtlSeconds: 120,

        staleAfterMinutes: 15,

        roundingStep: 1000,

        isActive: true,
      },
    });

  console.log(
    JSON.stringify(
      {
        successful: true,

        policies: [
          {
            material:
              goldPolicy.material,

            referencePurity:
              goldPolicy.referencePurity,

            defaultProfitPercent:
              goldPolicy.defaultProfitPercent.toString(),

            defaultTaxPercent:
              goldPolicy.defaultTaxPercent.toString(),

            taxMetalValue:
              goldPolicy.taxMetalValue,

            quoteTtlSeconds:
              goldPolicy.quoteTtlSeconds,

            staleAfterMinutes:
              goldPolicy.staleAfterMinutes,

            roundingStep:
              goldPolicy.roundingStep,

            isActive:
              goldPolicy.isActive,
          },

          {
            material:
              silverPolicy.material,

            referencePurity:
              silverPolicy.referencePurity,

            defaultProfitPercent:
              silverPolicy.defaultProfitPercent.toString(),

            defaultTaxPercent:
              silverPolicy.defaultTaxPercent.toString(),

            taxMetalValue:
              silverPolicy.taxMetalValue,

            quoteTtlSeconds:
              silverPolicy.quoteTtlSeconds,

            staleAfterMinutes:
              silverPolicy.staleAfterMinutes,

            roundingStep:
              silverPolicy.roundingStep,

            isActive:
              silverPolicy.isActive,
          },
        ],
      },

      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      "ثبت سیاست قیمت‌گذاری ناموفق بود:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });