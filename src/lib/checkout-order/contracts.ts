import type { Prisma } from "@/generated/prisma/client";
import type { CheckoutCustomerInput } from "@/lib/checkout-customer";
import type { ProductPriceResult } from "@/lib/product-pricing";

export const MAX_CART_ITEMS =
  30;

export const MAX_ITEM_QUANTITY =
  99;

export const INVENTORY_RESERVATION_MINUTES =
  15;

export const TRANSACTION_RETRY_COUNT =
  3;

export type CheckoutOrderItemInput = {
  slug: string;

  variantId:
    string | null;

  quantity:
    number;
};

export type CreateCheckoutOrderInput = {
  idempotencyKey:
    string;

  locale:
    string;

  customer:
    CheckoutCustomerInput;

  items:
    CheckoutOrderItemInput[];

  requestId?:
    string | null;
};

export type CheckoutOrderResult = {
  reused:
    boolean;

  order: {
    id:
      string;

    orderNumber:
      string;

    status:
      string;

    currency:
      "TOMAN";

    subtotalToman:
      string;

    payableToman:
      string;

    priceVerifiedAt:
      string;

    priceExpiresAt:
      string;

    inventoryReservedAt:
      string;

    inventoryExpiresAt:
      string;

    items: Array<{
      id:
        string;

      productSlug:
        string;

      variantId:
        string | null;

      quantity:
        number;

      unitPriceToman:
        string;

      lineTotalToman:
        string;

      stockBeforeReservation:
        number;

      stockAfterReservation:
        number;
    }>;
  };
};

export type CheckoutOrderErrorCode =
  | "INVALID_IDEMPOTENCY_KEY"
  | "IDEMPOTENCY_KEY_CONFLICT"
  | "INVALID_LOCALE"
  | "INVALID_CUSTOMER"
  | "INVALID_CART"
  | "INVALID_CART_ITEM"
  | "TOO_MANY_ITEMS"
  | "PRODUCT_UNAVAILABLE"
  | "INSUFFICIENT_STOCK"
  | "PENDING_ORDER_LIMIT"
  | "PRICE_EXPIRED"
  | "PRICING_FAILED"
  | "TRANSACTION_FAILED";

export class CheckoutOrderError extends Error {
  readonly code:
    CheckoutOrderErrorCode;

  readonly status:
    number;

  constructor(
    code:
      CheckoutOrderErrorCode,

    message:
      string,

    status =
      400,
  ) {
    super(message);

    this.name =
      "CheckoutOrderError";

    this.code =
      code;

    this.status =
      status;
  }
}

export type PricedCheckoutItem = {
  input:
    CheckoutOrderItemInput;

  result:
    ProductPriceResult;

  unitPriceToman:
    string;

  lineTotalToman:
    string;

  pricingSnapshot:
    Prisma.InputJsonValue;
};

export type ReservedCheckoutItem = {
  pricedItem:
    PricedCheckoutItem;

  stockBeforeReservation:
    number;

  stockAfterReservation:
    number;
};

export type SerializableOrder = {
  id:
    string;

  orderNumber:
    string;

  status:
    string;

  currency:
    string;

  subtotalToman: {
    toString():
      string;
  };

  payableToman: {
    toString():
      string;
  };

  priceVerifiedAt:
    Date;

  priceExpiresAt:
    Date;

  inventoryReservedAt:
    Date;

  inventoryExpiresAt:
    Date;

  items: Array<{
    id:
      string;

    productSlug:
      string;

    variantId:
      string | null;

    quantity:
      number;

    unitPriceToman: {
      toString():
        string;
    };

    lineTotalToman: {
      toString():
        string;
    };

    stockBeforeReservation:
      number;

    stockAfterReservation:
      number;
  }>;
};
