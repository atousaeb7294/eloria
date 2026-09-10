import { NextRequest, NextResponse } from "next/server";
import { initiateOrderPayment } from "@/lib/payment-service";
import { PaymentServiceError } from "@/lib/payment-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const orderId =
      typeof body.orderId === "string"
        ? body.orderId.trim()
        : "";

    if (!orderId) {
      return NextResponse.json(
        {
          successful: false,
          message: "شناسه سفارش معتبر نیست.",
        },
        { status: 400 },
      );
    }

    const payment = await initiateOrderPayment(orderId);

    return NextResponse.json({
      successful: true,
      payment,
    });
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return NextResponse.json(
        {
          successful: false,
          message: error.message,
        },
        { status: error.status },
      );
    }

    console.error("[Zibal Start]", error);

    return NextResponse.json(
      {
        successful: false,
        message: "شروع پرداخت انجام نشد.",
      },
      { status: 500 },
    );
  }
}