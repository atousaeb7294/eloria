import {
  randomUUID,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  CheckoutCustomerError,
  normalizeCheckoutCustomer,
  type CheckoutCustomerInput,
} from "@/lib/checkout-customer";

import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { readJsonBody } from "@/lib/security/json-body";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { isZarinpalConfigured } from "@/lib/payment/zarinpal";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { isCommerceEnabled } from "@/lib/runtime-features";
import { setPaymentStartAuthorizationCookie } from "@/lib/payment-start-authorization";

import {
  CheckoutOrderError,
  createCheckoutOrder,
  type CheckoutOrderItemInput,
} from "@/lib/checkout-order";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export const runtime =
  "nodejs";

type IncomingCheckoutBody = {
  idempotencyKey?: unknown;
  locale?: unknown;
  customer?: unknown;
  items?: unknown;
  turnstileToken?: unknown;
};

type IncomingCheckoutItem = {
  slug?: unknown;
  variantId?: unknown;
  quantity?: unknown;
};

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",

    Pragma:
      "no-cache",

    Expires:
      "0",
  };
}

function getRequestId(
  request:
    NextRequest,
): string {
  const suppliedRequestId =
    request.headers
      .get(
        "x-request-id",
      )
      ?.trim();

  if (
    suppliedRequestId
  ) {
    return suppliedRequestId.slice(
      0,
      128,
    );
  }

  return randomUUID();
}

function normalizeCustomerInput(
  value:
    unknown,
): CheckoutCustomerInput | null {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return null;
  }

  const customer =
    value as Record<
      string,
      unknown
    >;

  if (
    typeof customer.fullName !==
      "string" ||
    typeof customer.mobile !==
      "string" ||
    typeof customer.province !==
      "string" ||
    typeof customer.city !==
      "string" ||
    typeof customer.postalCode !==
      "string" ||
    typeof customer.address !==
      "string"
  ) {
    return null;
  }

  if (
    customer.email !==
      undefined &&
    customer.email !==
      null &&
    typeof customer.email !==
      "string"
  ) {
    return null;
  }

  return {
    fullName:
      customer.fullName,

    mobile:
      customer.mobile,

    email:
      customer.email ===
        undefined
        ? null
        : customer.email as
            string | null,

    province:
      customer.province,

    city:
      customer.city,

    postalCode:
      customer.postalCode,

    address:
      customer.address,
  };
}

function normalizeCheckoutItem(
  value:
    unknown,
): CheckoutOrderItemInput | null {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return null;
  }

  const item =
    value as IncomingCheckoutItem;

  if (
    typeof item.slug !==
      "string"
  ) {
    return null;
  }

  const slug =
    item.slug.trim();

  if (
    !slug ||
    slug.length >
      160
  ) {
    return null;
  }

  let variantId:
    string | null =
      null;

  if (
    typeof item.variantId ===
      "string"
  ) {
    variantId =
      item.variantId.trim() ||
      null;
  } else if (
    item.variantId !==
      null &&
    item.variantId !==
      undefined
  ) {
    return null;
  }

  if (
    typeof item.quantity !==
      "number" ||
    !Number.isInteger(
      item.quantity,
    ) ||
    item.quantity <
      1 ||
    item.quantity >
      99
  ) {
    return null;
  }

  return {
    slug,

    variantId,

    quantity:
      item.quantity,
  };
}

export async function POST(
  request:
    NextRequest,
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ successful: false, code: "INVALID_ORIGIN", message: "مبدأ درخواست معتبر نیست." }, { status: 403, headers: noStoreHeaders() });
  }

  if (!isCommerceEnabled()) {
    return NextResponse.json(
      { successful: false, code: "COMMERCE_DISABLED", message: "ثبت سفارش در حال حاضر غیرفعال است." },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  const rate = await consumeRateLimit({ key: `checkout:${requestIp(request)}`, limit: 12, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json({ successful: false, code: "RATE_LIMITED", message: "تعداد درخواست‌ها بیش از حد مجاز است." }, { status: 429, headers: { ...noStoreHeaders(), "Retry-After": String(rate.retryAfterSeconds) } });
  }

  const requestId =
    getRequestId(
      request,
    );

  try {
    let body:
      IncomingCheckoutBody;

    try {
      const parsed:
        unknown =
          await readJsonBody(request, 64 * 1024);

      if (
        typeof parsed !==
          "object" ||
        parsed === null
      ) {
        throw new Error(
          "INVALID_BODY",
        );
      }

      body =
        parsed as IncomingCheckoutBody;
    } catch {
      return NextResponse.json(
        {
          successful:
            false,

          code:
            "INVALID_JSON",

          message:
            "ساختار اطلاعات سفارش معتبر نیست.",

          requestId,
        },
        {
          status:
            400,

          headers:
            noStoreHeaders(),
        },
      );
    }

    const normalizedCustomer =
      normalizeCustomerInput(
        body.customer,
      );

    if (
      typeof body.idempotencyKey !==
        "string" ||
      typeof body.locale !==
        "string" ||
      !normalizedCustomer ||
      !Array.isArray(
        body.items,
      )
    ) {
      return NextResponse.json(
        {
          successful:
            false,

          code:
            "INVALID_CHECKOUT",

          message:
            "اطلاعات ثبت سفارش کامل یا معتبر نیست.",

          requestId,
        },
        {
          status:
            400,

          headers:
            noStoreHeaders(),
        },
      );
    }

    let canonicalCustomer;
    try {
      canonicalCustomer = normalizeCheckoutCustomer(normalizedCustomer);
    } catch (error) {
      return NextResponse.json(
        {
          successful: false,
          code: error instanceof CheckoutCustomerError ? error.code : "INVALID_CUSTOMER",
          message: error instanceof Error ? error.message : "اطلاعات مشتری معتبر نیست.",
          requestId,
        },
        { status: 400, headers: noStoreHeaders() },
      );
    }

    // ELORIA_V3_CUSTOMER_CHECKOUT
    const authenticatedCustomer = await getCustomerFromRequest(request);
    if (authenticatedCustomer && authenticatedCustomer.customer.mobile !== canonicalCustomer.mobile) {
      return NextResponse.json(
        { successful: false, code: "ACCOUNT_MOBILE_MISMATCH", message: "شماره موبایل سفارش باید با حساب واردشده یکسان باشد.", requestId },
        { status: 409, headers: noStoreHeaders() },
      );
    }

    const clientIp = requestIp(request);
    const challenge = await verifyTurnstileToken({
      token: typeof body.turnstileToken === "string" ? body.turnstileToken : null,
      ip: clientIp,
      expectedAction: "checkout",
    });
    if (!challenge.successful) {
      return NextResponse.json(
        { successful: false, code: "CHALLENGE_FAILED", message: "تأیید امنیتی سفارش ناموفق بود.", requestId },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const mobileRate = await consumeRateLimit({
      key: `checkout-mobile:${canonicalCustomer.mobile}`,
      limit: 4,
      windowMs: 30 * 60_000,
    });
    if (!mobileRate.allowed) {
      return NextResponse.json(
        { successful: false, code: "MOBILE_RATE_LIMITED", message: "برای این شماره موبایل سفارش‌های زیادی ثبت شده است.", requestId },
        { status: 429, headers: { ...noStoreHeaders(), "Retry-After": String(mobileRate.retryAfterSeconds) } },
      );
    }

    if (
      body.items.length ===
      0
    ) {
      return NextResponse.json(
        {
          successful:
            false,

          code:
            "EMPTY_CART",

          message:
            "سبد خرید خالی است.",

          requestId,
        },
        {
          status:
            400,

          headers:
            noStoreHeaders(),
        },
      );
    }

    if (
      body.items.length >
      30
    ) {
      return NextResponse.json(
        {
          successful:
            false,

          code:
            "TOO_MANY_ITEMS",

          message:
            "تعداد اقلام سفارش بیش از حد مجاز است.",

          requestId,
        },
        {
          status:
            400,

          headers:
            noStoreHeaders(),
        },
      );
    }

    const normalizedItems =
      body.items.map(
        normalizeCheckoutItem,
      );

    if (
      normalizedItems.some(
        (
          item,
        ) =>
          item === null,
      )
    ) {
      return NextResponse.json(
        {
          successful:
            false,

          code:
            "INVALID_CART_ITEM",

          message:
            "حداقل یکی از اقلام سبد خرید معتبر نیست.",

          requestId,
        },
        {
          status:
            400,

          headers:
            noStoreHeaders(),
        },
      );
    }

    const result =
      await createCheckoutOrder({
        idempotencyKey:
          body.idempotencyKey,

        locale:
          body.locale,

        customer:
          canonicalCustomer,

        items:
          normalizedItems as CheckoutOrderItemInput[],

        requestId,
      });

    if (authenticatedCustomer) {
      try {
        await prisma.$transaction([
          prisma.order.updateMany({ where: { id: result.order.id, customerId: null }, data: { customerId: authenticatedCustomer.customer.id } }),
          prisma.customer.update({
            where: { id: authenticatedCustomer.customer.id },
            data: { fullName: canonicalCustomer.fullName, email: canonicalCustomer.email },
          }),
        ]);
        if (!result.reused) {
          await prisma.customerNotification.create({
            data: {
              customerId: authenticatedCustomer.customer.id,
              type: "ORDER_CREATED",
              titleFa: "سفارش ثبت شد",
              titleEn: "Order created",
              bodyFa: `سفارش ${result.order.orderNumber} با موفقیت ثبت شد و در انتظار پرداخت است.`,
              bodyEn: `Order ${result.order.orderNumber} was created and is awaiting payment.`,
              orderId: result.order.id,
            },
          });
        }
      } catch (customerLinkError) {
        // Checkout itself already succeeded. Do not return a false checkout failure
        // because account enrichment or its notification failed.
        console.error("[Eloria Customer] order account enrichment failed", customerLinkError);
      }
    }

    const paymentConfigured =
      isZarinpalConfigured();

    /*
     * ساخت Authority زرین‌پال از ثبت سفارش جداست. سفارش و رزرو موجودی فوراً
     * پاسخ داده می‌شوند و مشتری با دکمه مستقل وارد مرحله پرداخت می‌شود.
     */
    const payment = {
      configured:
        paymentConfigured,

      redirectUrl:
        null,

      message:
        paymentConfigured
          ? "سفارش ثبت شد. برای ورود به درگاه پرداخت، دکمه پرداخت را بزنید."
          : "درگاه پرداخت پیکربندی نشده است.",
    };

    const response = NextResponse.json(
      {
        successful:
          true,

        reused:
          result.reused,

        order:
          result.order,

        payment,

        requestId,
      },
      {
        status:
          result.reused
            ? 200
            : 201,

        headers:
          noStoreHeaders(),
      },
    );

    if (paymentConfigured) {
      setPaymentStartAuthorizationCookie(
        response,
        {
          orderId: result.order.id,
          amountToman: result.order.payableToman,
          mobile: canonicalCustomer.mobile,
        },
      );
    }

    return response;
  } catch (error) {
    if (
      error instanceof
      CheckoutOrderError
    ) {
      return NextResponse.json(
        {
          successful:
            false,

          code:
            error.code,

          message:
            error.message,

          requestId,
        },
        {
          status:
            error.status,

          headers:
            noStoreHeaders(),
        },
      );
    }

    console.error(
      "[Eloria Checkout API] Unexpected order creation error.",
      {
        requestId,
        error,
      },
    );

    return NextResponse.json(
      {
        successful:
          false,

        code:
          "INTERNAL_ERROR",

        message:
          "ثبت سفارش در حال حاضر امکان‌پذیر نیست. لطفاً دوباره تلاش کنید.",

        requestId,
      },
      {
        status:
          500,

        headers:
          noStoreHeaders(),
      },
    );
  }
}