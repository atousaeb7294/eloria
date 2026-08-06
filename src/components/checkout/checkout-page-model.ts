import { readCartItems, type CartItem } from "@/lib/cart-storage";
export type QuotedCartItem = {
  slug: string;
  variantId: string | null;
  quantity: number;

  product: {
    id: string;
    nameFa: string;
    nameEn: string;
    material: "GOLD" | "SILVER";
    sku: string | null;
    stock: number;
    isPurchasable: boolean;
  };

  variant: {
    id: string;
    titleFa: string;
    titleEn: string;
    sku: string | null;
    stock: number;
  } | null;

  pricing: {
    currency: "TOMAN";
    unitPriceToman: string;
    lineTotalToman: string;
  };

  canPurchase: boolean;
  unavailableReason: string | null;
};

export type FailedCartItem = {
  slug: string;
  variantId: string | null;
  quantity: number;
  code: string;
  message: string;
};

export type CartQuoteResponse = {
  successful: true;
  currency: "TOMAN";
  items: QuotedCartItem[];
  failedItems: FailedCartItem[];

  summary: {
    uniqueItems: number;
    totalQuantity: number;
    subtotalToman: string;
    canCheckout: boolean;
  };

  generatedAt: string;
};

export type CreatedOrder = {
  id: string;
  paymentConfigured?: boolean;
  paymentUrl?: string | null;
  paymentMessage?: string;
  orderNumber: string;
  status: string;
  currency: "TOMAN";
  subtotalToman: string;
  payableToman: string;
  priceVerifiedAt: string;
  priceExpiresAt: string;
  inventoryReservedAt: string;
  inventoryExpiresAt: string;

  items: Array<{
    id: string;
    productSlug: string;
    variantId: string | null;
    quantity: number;
    unitPriceToman: string;
    lineTotalToman: string;
    stockBeforeReservation: number;
    stockAfterReservation: number;
  }>;
};

export type CreateOrderResponse = {
  successful: true;
  reused: boolean;
  order: CreatedOrder;
  payment: {
    configured: boolean;
    redirectUrl: string | null;
    message: string;
  };
  requestId: string;
};

export type CustomerForm = {
  fullName: string;
  mobile: string;
  email: string;
  province: string;
  city: string;
  postalCode: string;
  address: string;
};

export type PriceChangeNotice = {
  previousSubtotalToman: string;
  currentSubtotalToman: string;
};

export type CheckoutPageClientProps = {
  locale: "fa" | "en";
  persianTitleClassName: string;
};

export const FA_TEXT = {
  eyebrow: "Eloria Secure Checkout",
  title: "تکمیل سفارش",
  description:
    "قیمت و موجودی پیش از ثبت سفارش دوباره مستقیماً از سرور بررسی می‌شود.",

  customerTitle:
    "اطلاعات خریدار و تحویل",

  customerDescription:
    "اطلاعات را دقیق و مطابق نشانی دریافت سفارش وارد کنید.",

  fullName:
    "نام و نام خانوادگی",

  mobile:
    "شماره موبایل",

  email:
    "ایمیل اختیاری",

  province:
    "استان",

  city:
    "شهر",

  postalCode:
    "کد پستی",

  address:
    "نشانی کامل تحویل",

  fullNamePlaceholder:
    "نام و نام خانوادگی خریدار",

  mobilePlaceholder:
    "مثلاً ۰۹۱۲۱۲۳۴۵۶۷",

  emailPlaceholder:
    "example@email.com",

  provincePlaceholder:
    "نام استان",

  cityPlaceholder:
    "نام شهر",

  postalCodePlaceholder:
    "کد پستی ۱۰ رقمی",

  addressPlaceholder:
    "خیابان، کوچه، پلاک، واحد و توضیحات لازم",

  summary:
    "خلاصه سفارش",

  quantity:
    "تعداد",

  unitPrice:
    "قیمت واحد",

  subtotal:
    "مبلغ سفارش",

  payable:
    "مبلغ قابل پرداخت",

  toman:
    "تومان",

  loading:
    "در حال دریافت آخرین قیمت و موجودی...",

  retry:
    "بررسی دوباره",

  cart:
    "بازگشت به سبد خرید",

  products:
    "مشاهده محصولات",

  emptyTitle:
    "سبد خرید خالی است",

  emptyDescription:
    "برای ادامه پرداخت ابتدا محصولی به سبد خرید اضافه کنید.",

  unavailable:
    "حداقل یکی از محصولات در حال حاضر قابل سفارش نیست.",

  rateFailed:
    "بررسی نرخ بازار انجام نشد. ثبت سفارش تا دریافت نرخ معتبر متوقف است.",

  priceUpdated:
    "قیمت سفارش به‌روزرسانی شد",

  priceUpdatedDescription:
    "قیمت یا مبلغ یکی از محصولات تغییر کرده است. مبلغ جدید جایگزین شد.",

  previousAmount:
    "مبلغ قبلی",

  currentAmount:
    "مبلغ جدید",

  submit:
    "ثبت سفارش و ادامه پرداخت",

  submitting:
    "در حال بررسی نهایی و ثبت سفارش...",

  secureNotice:
    "مبلغ ارسالی مرورگر پذیرفته نمی‌شود؛ قیمت نهایی توسط سرور الوریا محاسبه می‌شود.",

  reservationNotice:
    "پس از ثبت سفارش، موجودی محصولات به مدت ۱۵ دقیقه برای شما رزرو می‌شود.",

  orderCreated:
    "سفارش با موفقیت ثبت شد",

  orderNumber:
    "شماره سفارش",

  verifiedAmount:
    "مبلغ تأییدشده سرور",

  reservedUntil:
    "مهلت رزرو موجودی",

  gatewayPending:
    "اتصال نهایی درگاه پرداخت هم‌زمان با راه‌اندازی هاست و دامنه فعال می‌شود.",

  gatewayButton:
    "درگاه پرداخت هنوز فعال نشده است",

  changedBeforeSubmit:
    "قیمت سفارش تغییر کرده است. مبلغ جدید را بررسی کرده و دوباره دکمه ادامه پرداخت را بزنید.",

  genericError:
    "ثبت سفارش در حال حاضر امکان‌پذیر نیست. لطفاً دوباره تلاش کنید.",

  dismiss:
    "بستن اعلان",

  lastChecked:
    "آخرین بررسی",
} as const;

export const EN_TEXT = {
  eyebrow: "Eloria Secure Checkout",
  title: "Complete your order",
  description:
    "Price and availability are verified directly by the server before order creation.",

  customerTitle:
    "Customer and delivery details",

  customerDescription:
    "Enter accurate information for delivery and order processing.",

  fullName:
    "Full name",

  mobile:
    "Mobile number",

  email:
    "Optional email",

  province:
    "Province",

  city:
    "City",

  postalCode:
    "Postal code",

  address:
    "Full delivery address",

  fullNamePlaceholder:
    "Customer full name",

  mobilePlaceholder:
    "Example: 09121234567",

  emailPlaceholder:
    "example@email.com",

  provincePlaceholder:
    "Province",

  cityPlaceholder:
    "City",

  postalCodePlaceholder:
    "10-digit postal code",

  addressPlaceholder:
    "Street, building number, unit, and delivery notes",

  summary:
    "Order summary",

  quantity:
    "Quantity",

  unitPrice:
    "Unit price",

  subtotal:
    "Order amount",

  payable:
    "Payable amount",

  toman:
    "Toman",

  loading:
    "Checking the latest price and availability...",

  retry:
    "Check again",

  cart:
    "Back to shopping bag",

  products:
    "Explore products",

  emptyTitle:
    "Your shopping bag is empty",

  emptyDescription:
    "Add a product to your shopping bag before continuing.",

  unavailable:
    "At least one product is currently unavailable.",

  rateFailed:
    "The market rate could not be verified. Order creation is temporarily unavailable.",

  priceUpdated:
    "Order price updated",

  priceUpdatedDescription:
    "A product price or the order amount changed. The new amount is now displayed.",

  previousAmount:
    "Previous amount",

  currentAmount:
    "New amount",

  submit:
    "Create order and continue",

  submitting:
    "Verifying and creating your order...",

  secureNotice:
    "Browser-submitted amounts are ignored; the final amount is calculated by the Eloria server.",

  reservationNotice:
    "After order creation, inventory is reserved for 15 minutes.",

  orderCreated:
    "Order created successfully",

  orderNumber:
    "Order number",

  verifiedAmount:
    "Server-verified amount",

  reservedUntil:
    "Inventory reserved until",

  gatewayPending:
    "The payment gateway will be activated when hosting and the production domain are connected.",

  gatewayButton:
    "Payment gateway is not active yet",

  changedBeforeSubmit:
    "The order price changed. Review the new amount and submit again.",

  genericError:
    "The order cannot be created right now. Please try again.",

  dismiss:
    "Dismiss notification",

  lastChecked:
    "Last checked",
} as const;

const CHECKOUT_SESSION_KEY =
  "eloria-checkout-idempotency-v1";

export function getCartSnapshot(): string {
  return JSON.stringify(
    readCartItems(),
  );
}

export function getServerCartSnapshot(): string {
  return "[]";
}

export function parseCartSnapshot(
  snapshot: string,
): CartItem[] {
  try {
    const parsed: unknown =
      JSON.parse(snapshot);

    return Array.isArray(parsed)
      ? (parsed as CartItem[])
      : [];
  } catch {
    return [];
  }
}

export function isCartQuoteResponse(
  value: unknown,
): value is CartQuoteResponse {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<CartQuoteResponse>;

  return (
    candidate.successful === true &&
    Array.isArray(candidate.items) &&
    Array.isArray(
      candidate.failedItems,
    ) &&
    typeof candidate.summary ===
      "object" &&
    candidate.summary !== null &&
    typeof candidate.generatedAt ===
      "string"
  );
}

export function isCreateOrderResponse(
  value: unknown,
): value is CreateOrderResponse {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<CreateOrderResponse>;

  return (
    candidate.successful === true &&
    typeof candidate.reused ===
      "boolean" &&
    typeof candidate.order ===
      "object" &&
    candidate.order !== null &&
    typeof candidate.order.id ===
      "string" &&
    typeof candidate.order.orderNumber ===
      "string" &&
    typeof candidate.order.payableToman ===
      "string" &&
    typeof candidate.order.inventoryExpiresAt ===
      "string" &&
    typeof candidate.payment === "object" &&
    candidate.payment !== null &&
    typeof candidate.payment.configured === "boolean"
  );
}

export function getErrorMessage(
  value: unknown,
  fallback: string,
): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message ===
      "string"
  ) {
    return value.message;
  }

  return fallback;
}

export function getItemKey(
  item: {
    slug: string;
    variantId: string | null;
  },
): string {
  return `${item.slug}:${item.variantId ?? "default"}`;
}

export function didQuotePriceChange(
  previousQuote: CartQuoteResponse,
  currentQuote: CartQuoteResponse,
): boolean {
  if (
    previousQuote.summary
      .subtotalToman !==
    currentQuote.summary
      .subtotalToman
  ) {
    return true;
  }

  const previousPrices =
    new Map<string, string>();

  for (
    const item of
    previousQuote.items
  ) {
    previousPrices.set(
      getItemKey(item),
      item.pricing
        .unitPriceToman,
    );
  }

  if (
    previousQuote.items.length !==
    currentQuote.items.length
  ) {
    return true;
  }

  return currentQuote.items.some(
    (item) =>
      previousPrices.get(
        getItemKey(item),
      ) !==
      item.pricing
        .unitPriceToman,
  );
}

export function getCartFingerprint(
  items: CartItem[],
): string {
  return items
    .map((item) => ({
      slug:
        item.slug,

      variantId:
        item.variantId,

      quantity:
        item.quantity,
    }))
    .sort((first, second) =>
      getItemKey(first).localeCompare(
        getItemKey(second),
      ),
    )
    .map(
      (item) =>
        `${getItemKey(item)}:${item.quantity}`,
    )
    .join("|");
}

export function generateIdempotencyKey(): string {
  return `checkout:${window.crypto.randomUUID()}`;
}

export function getOrCreateIdempotencyKey(
  items: CartItem[],
): string {
  const fingerprint =
    getCartFingerprint(items);

  try {
    const stored =
      window.sessionStorage.getItem(
        CHECKOUT_SESSION_KEY,
      );

    if (stored) {
      const parsed: unknown =
        JSON.parse(stored);

      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "fingerprint" in parsed &&
        "key" in parsed &&
        parsed.fingerprint ===
          fingerprint &&
        typeof parsed.key ===
          "string"
      ) {
        return parsed.key;
      }
    }
  } catch {
    // در صورت غیرفعال بودن Session Storage، کلید حافظه‌ای استفاده می‌شود.
  }

  const key =
    generateIdempotencyKey();

  try {
    window.sessionStorage.setItem(
      CHECKOUT_SESSION_KEY,
      JSON.stringify({
        fingerprint,
        key,
      }),
    );
  } catch {
    // ادامه فرایند بدون ذخیره Session Storage ممکن است.
  }

  return key;
}
