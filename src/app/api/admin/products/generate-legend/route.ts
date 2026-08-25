import { NextResponse } from "next/server";
import { generateProductMyth } from "@/lib/ai/myth-generator";

export async function POST(request: Request) {
  try {
    const product = await request.json();

    if (!product?.name) {
      return NextResponse.json(
        {
          error: "product name is required",
        },
        {
          status: 400,
        },
      );
    }

    const legend = await generateProductMyth(product);

    return NextResponse.json({
      success: true,

      legend,
    });
  } catch (error) {
    console.error("legend generation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "failed to generate legend",
      },

      {
        status: 500,
      },
    );
  }
}
