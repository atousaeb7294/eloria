import { NextRequest, NextResponse } from "next/server";

import {
  getProductLivePrice,
  ProductPricingError,
} from "@/lib/product-pricing";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { slug } =
      await context.params;

    const variantId =
      request.nextUrl.searchParams.get(
        "variantId",
      );

    const result =
      await getProductLivePrice({
        slug,
        variantId,
      });

    return NextResponse.json(
      {
        successful: true,
        ...result,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof
      ProductPricingError
    ) {
      return NextResponse.json(
        {
          successful: false,
          code: error.code,
          message: error.message,
        },
        {
          status: error.status,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    console.error(
      "خطا در محاسبه قیمت محصول:",
      error,
    );

    return NextResponse.json(
      {
        successful: false,
        code: "INTERNAL_ERROR",
        message:
          "محاسبه قیمت محصول امکان‌پذیر نیست.",
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