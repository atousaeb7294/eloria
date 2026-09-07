import { NextResponse } from "next/server";

import { getMetalPriceSnapshot } from "@/lib/metal-prices";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

export async function GET() {
  try {
    const snapshot =
      await getMetalPriceSnapshot();

    return NextResponse.json(
      {
        successful: true,
        ...snapshot,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error(
      "خطا در خواندن نرخ‌ها:",
      error,
    );

    return NextResponse.json(
      {
        successful: false,
        message:
          "دریافت نرخ فلزات امکان‌پذیر نیست.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}