import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCustomerFromRequest,
} from "@/lib/customer-auth";
import {
  initiateOrderPayment,
  PaymentServiceError,
} from "@/lib/payment-service";
import {
  readPaymentStartAuthorizationCookie,
  verifyPaymentStartAuthorization,
} from "@/lib/payment-start-authorization";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
} from "@/lib/security/rate-limit";
import {
  hasTrustedOrigin,
  requestIp,
} from "@/lib/security/request";
import {
  readJsonBody,
} from "@/lib/security/json-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore() {
  return {
    "Cache-Control": "no-store",
  };
}

export async function POST(
  request: NextRequest,
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      {
        successful: false,
        message: "مبدأ درخواست معتبر نیست.",
      },
      {
        status: 403,
        headers: noStore(),
      },
    );
  }

  const ip = requestIp(request);
  const rate = await consumeRateLimit({
    key: `payment-start:${ip}`,
    limit: 8,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      {
        successful: false,
        message: "درخواست‌های پرداخت بیش از حد مجاز است.",
      },
      {
        status: 429,
        headers: {
          ...noStore(),
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  const body =
    await readJsonBody<{
      orderId?: unknown;
    }>(
      request,
      8 * 1024,
    ).catch(() => null);

  if (
    !body ||
    typeof body.orderId !== "string" ||
    !body.orderId.trim()
  ) {
    return NextResponse.json(
      {
        successful: false,
        message: "اطلاعات پرداخت معتبر نیست.",
      },
      {
        status: 400,
        headers: noStore(),
      },
    );
  }

  const orderId = body.orderId.trim();

  const orderRate = await consumeRateLimit({
    key: `payment-start-order:${orderId}`,
    limit: 6,
    windowMs: 5 * 60_000,
  });

  if (!orderRate.allowed) {
    return NextResponse.json(
      {
        successful: false,
        message: "تعداد تلاش برای این سفارش بیش از حد مجاز است.",
      },
      {
        status: 429,
        headers: {
          ...noStore(),
          "Retry-After": String(
            orderRate.retryAfterSeconds,
          ),
        },
      },
    );
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      id: true,
      customerId: true,
      customerMobile: true,
      payableToman: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      {
        successful: false,
        message: "سفارش پیدا نشد.",
      },
      {
        status: 404,
        headers: noStore(),
      },
    );
  }

  const customerAuth =
    await getCustomerFromRequest(request);

  let authorized = false;

  if (order.customerId) {
    authorized =
      customerAuth?.customer.id ===
      order.customerId;
  } else if (order.customerMobile) {
    const token =
      readPaymentStartAuthorizationCookie(
        request,
        order.id,
      );

    authorized = Boolean(
      token &&
        verifyPaymentStartAuthorization(
          token,
          {
            orderId: order.id,
            amountToman:
              order.payableToman.toString(),
            mobile:
              order.customerMobile,
          },
        ),
    );
  }

  if (!authorized) {
    return NextResponse.json(
      {
        successful: false,
        message: "مجوز شروع پرداخت معتبر نیست.",
      },
      {
        status: 403,
        headers: noStore(),
      },
    );
  }

  try {
    const payment =
      await initiateOrderPayment(
        order.id,
      );

    return NextResponse.json(
      {
        successful: true,
        payment,
      },
      {
        headers: noStore(),
      },
    );
  } catch (error) {
    if (
      error instanceof
      PaymentServiceError
    ) {
      return NextResponse.json(
        {
          successful: false,
          message: error.message,
        },
        {
          status: error.status,
          headers: noStore(),
        },
      );
    }

    console.error(
      "[Eloria Payment Start] Unexpected payment initialization error.",
      error,
    );

    return NextResponse.json(
      {
        successful: false,
        message:
          "ارتباط با درگاه پرداخت انجام نشد. لطفاً دوباره تلاش کنید.",
      },
      {
        status: 502,
        headers: noStore(),
      },
    );
  }
}
