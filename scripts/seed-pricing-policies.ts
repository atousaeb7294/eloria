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

        // نرخ تازه در حالت عادی حداکثر ۱۵ دقیقه اعتبار دارد.
        staleAfterMinutes: 15,

        // استفاده از آخرین نرخ معتبر هنگام بسته‌بودن بازار
        closedMarketPricingEnabled:
          true,

        // حداکثر عمر نرخ قابل‌استفاده در این حالت: ۱۰ روز
        closedMarketMaxAgeMinutes:
          14400,

        // حداقل حاشیه امنیت طلا: ۳ درصد؛ مقدار نهایی پلکانی است
        closedMarketSafetyMarginPercent:
          "3",

        // گردکردن قیمت نهایی به نزدیک‌ترین هزار تومان
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

        closedMarketPricingEnabled:
          true,

        closedMarketMaxAgeMinutes:
          14400,

        closedMarketSafetyMarginPercent:
          "3",

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
         * سیاست مالیاتی نقره مستقل از طلا است.
         * تا زمان تأیید نهایی، اصل فلز وارد پایه مالیات نمی‌شود.
         */
        taxMetalValue: false,

        quoteTtlSeconds: 120,

        staleAfterMinutes: 15,

        closedMarketPricingEnabled:
          true,

        closedMarketMaxAgeMinutes:
          14400,

        closedMarketSafetyMarginPercent:
          "5",

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

        closedMarketPricingEnabled:
          true,

        closedMarketMaxAgeMinutes:
          14400,

        closedMarketSafetyMarginPercent:
          "5",

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

            closedMarketPricingEnabled:
              goldPolicy.closedMarketPricingEnabled,

            closedMarketMaxAgeMinutes:
              goldPolicy.closedMarketMaxAgeMinutes,

            closedMarketSafetyMarginPercent:
              goldPolicy.closedMarketSafetyMarginPercent.toString(),

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

            closedMarketPricingEnabled:
              silverPolicy.closedMarketPricingEnabled,

            closedMarketMaxAgeMinutes:
              silverPolicy.closedMarketMaxAgeMinutes,

            closedMarketSafetyMarginPercent:
              silverPolicy.closedMarketSafetyMarginPercent.toString(),

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
  .catch((error: unknown) => {
    console.error(
      "ثبت سیاست قیمت‌گذاری ناموفق بود:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });