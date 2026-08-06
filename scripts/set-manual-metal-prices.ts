import "dotenv/config";

import { createHash } from "node:crypto";

import { databasePool, prisma } from "../src/lib/prisma";

type Material = "GOLD" | "SILVER";

type Arguments = {
  gold?: string;
  silver?: string;
  sourceAt?: string;
  confirm?: string;
};

function parseArguments(): Arguments {
  const values: Arguments = {};

  for (const item of process.argv.slice(2)) {
    const [rawKey, ...rawValue] = item.replace(/^--/, "").split("=");
    const value = rawValue.join("=").trim();

    if (rawKey === "gold") values.gold = value;
    if (rawKey === "silver") values.silver = value;
    if (rawKey === "source-at") values.sourceAt = value;
    if (rawKey === "confirm") values.confirm = value;
  }

  return values;
}

function parsePositiveToman(value: string | undefined, label: string): bigint | null {
  if (value === undefined) return null;

  const normalized = value.replace(/[,_\s]/g, "");
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} باید عدد صحیح مثبت و بر حسب تومان برای هر گرم باشد.`);
  }

  const amount = BigInt(normalized);
  if (amount <= 0n) {
    throw new Error(`${label} باید بیشتر از صفر باشد.`);
  }

  return amount;
}

function parseSourceMoment(value: string | undefined): Date {
  const sourceAt = value ? new Date(value) : new Date();

  if (Number.isNaN(sourceAt.getTime())) {
    throw new Error("--source-at باید تاریخ ISO معتبر باشد؛ مانند 2026-08-06T03:00:00+03:30");
  }

  const now = Date.now();
  if (sourceAt.getTime() > now + 5 * 60 * 1000) {
    throw new Error("زمان نرخ دستی نمی‌تواند بیش از پنج دقیقه در آینده باشد.");
  }

  return sourceAt;
}

async function saveManualRate({
  material,
  pricePerGram,
  sourceAt,
}: {
  material: Material;
  pricePerGram: bigint;
  sourceAt: Date;
}) {
  const referencePurity = material === "GOLD" ? 750 : 999;
  const sourceTimeUnix = BigInt(Math.floor(sourceAt.getTime() / 1000));
  const sourceDate = sourceAt.toISOString().slice(0, 10);
  const sourceTime = sourceAt.toISOString().slice(11, 19);
  const fetchedAt = new Date();
  const rawPayload = {
    enteredManually: true,
    material,
    pricePerGramToman: pricePerGram.toString(),
    sourceAt: sourceAt.toISOString(),
  };

  const record = await prisma.metalPrice.upsert({
    where: { material },
    create: {
      material,
      pricePerGram: pricePerGram.toString(),
      referencePurity,
      currency: "TOMAN",
      source: "MANUAL_OPERATOR",
      sourceSymbol: `MANUAL_${material}`,
      sourceUnit: "TOMAN_PER_GRAM",
      sourceDate,
      sourceTime,
      sourceTimeUnix,
      fetchedAt,
      lastSuccessAt: fetchedAt,
      lastError: null,
      rawPayload,
    },
    update: {
      pricePerGram: pricePerGram.toString(),
      referencePurity,
      currency: "TOMAN",
      source: "MANUAL_OPERATOR",
      sourceSymbol: `MANUAL_${material}`,
      sourceUnit: "TOMAN_PER_GRAM",
      sourceDate,
      sourceTime,
      sourceTimeUnix,
      fetchedAt,
      lastSuccessAt: fetchedAt,
      lastError: null,
      rawPayload,
    },
  });

  const fingerprint = createHash("sha256")
    .update(
      [
        "MANUAL_OPERATOR",
        material,
        pricePerGram.toString(),
        sourceTimeUnix.toString(),
      ].join("|"),
    )
    .digest("hex");

  const existingHistory = await prisma.metalPriceHistory.findUnique({
    where: { fingerprint },
    select: { id: true },
  });

  if (!existingHistory) {
    await prisma.metalPriceHistory.create({
      data: {
        metalPriceId: record.id,
        material,
        pricePerGram: pricePerGram.toString(),
        referencePurity,
        currency: "TOMAN",
        source: "MANUAL_OPERATOR",
        sourceSymbol: `MANUAL_${material}`,
        sourceUnit: "TOMAN_PER_GRAM",
        sourceDate,
        sourceTime,
        sourceTimeUnix,
        fetchedAt,
        fingerprint,
        rawPayload,
      },
    });
  }

  return {
    material,
    pricePerGramToman: pricePerGram.toString(),
    referencePurity,
    sourceAt: sourceAt.toISOString(),
  };
}

async function main() {
  const args = parseArguments();

  if (args.confirm !== "SET_MANUAL_METAL_RATES") {
    throw new Error(
      "برای جلوگیری از ثبت تصادفی، --confirm=SET_MANUAL_METAL_RATES الزامی است.",
    );
  }

  const gold = parsePositiveToman(args.gold, "نرخ طلا");
  const silver = parsePositiveToman(args.silver, "نرخ نقره");

  if (gold === null && silver === null) {
    throw new Error("حداقل یکی از --gold یا --silver را وارد کنید.");
  }

  const sourceAt = parseSourceMoment(args.sourceAt);
  const saved = [];

  if (gold !== null) {
    saved.push(await saveManualRate({ material: "GOLD", pricePerGram: gold, sourceAt }));
  }

  if (silver !== null) {
    saved.push(await saveManualRate({ material: "SILVER", pricePerGram: silver, sourceAt }));
  }

  console.log(
    JSON.stringify(
      {
        successful: true,
        warning:
          "این نرخ‌ها دستی ثبت شده‌اند. منبع و زمان نرخ را پیش از فروش دوباره کنترل کنید.",
        rates: saved,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Manual metal-rate update failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await databasePool.end();
  });
