import {
  randomUUID,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  type CheckoutCustomerInput,
} from "@/lib/checkout-customer";

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
          await request.json();

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
          normalizedCustomer,

        items:
          normalizedItems as CheckoutOrderItemInput[],

        requestId,
      });

    return NextResponse.json(
      {
        successful:
          true,

        reused:
          result.reused,

        order:
          result.order,

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