"use client";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  CART_LIVE_PRICE_EVENT,
  type CartLivePriceEventDetail,
} from "@/components/cart-live-price-refresh";

import {
  CheckoutCustomerError,
  normalizeCheckoutCustomer,
  type CheckoutCustomerInput,
} from "@/lib/checkout-customer";

import {
  readCartItems,
  subscribeToCart,
  type CartItem,
} from "@/lib/cart-storage";

type QuotedCartItem = {
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

type FailedCartItem = {
  slug: string;
  variantId: string | null;
  quantity: number;
  code: string;
  message: string;
};

type CartQuoteResponse = {
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

type CreatedOrder = {
  id: string;
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

type CreateOrderResponse = {
  successful: true;
  reused: boolean;
  order: CreatedOrder;
  requestId: string;
};

type CustomerForm = {
  fullName: string;
  mobile: string;
  email: string;
  province: string;
  city: string;
  postalCode: string;
  address: string;
};

type PriceChangeNotice = {
  previousSubtotalToman: string;
  currentSubtotalToman: string;
};

type CheckoutPageClientProps = {
  locale: string;
  persianTitleClassName: string;
};

const FA_TEXT = {
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

const EN_TEXT = {
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

function getCartSnapshot(): string {
  return JSON.stringify(
    readCartItems(),
  );
}

function getServerCartSnapshot(): string {
  return "[]";
}

function parseCartSnapshot(
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

function isCartQuoteResponse(
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

function isCreateOrderResponse(
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
      "string"
  );
}

function getErrorMessage(
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

function getItemKey(
  item: {
    slug: string;
    variantId: string | null;
  },
): string {
  return `${item.slug}:${item.variantId ?? "default"}`;
}

function didQuotePriceChange(
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

function getCartFingerprint(
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

function generateIdempotencyKey(): string {
  return `checkout:${window.crypto.randomUUID()}`;
}

function getOrCreateIdempotencyKey(
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

export function CheckoutPageClient({
  locale,
  persianTitleClassName,
}: CheckoutPageClientProps) {
  const isPersian =
    locale === "fa";

  const text =
    isPersian
      ? FA_TEXT
      : EN_TEXT;

  const cartSnapshot =
    useSyncExternalStore(
      subscribeToCart,
      getCartSnapshot,
      getServerCartSnapshot,
    );

  const storedItems =
    useMemo(
      () =>
        parseCartSnapshot(
          cartSnapshot,
        ),
      [cartSnapshot],
    );

  const [
    quote,
    setQuote,
  ] =
    useState<CartQuoteResponse | null>(
      null,
    );

  const [
    quoteLoading,
    setQuoteLoading,
  ] =
    useState(true);

  const [
    quoteError,
    setQuoteError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    livePriceFailed,
    setLivePriceFailed,
  ] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    submitError,
    setSubmitError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    createdOrder,
    setCreatedOrder,
  ] =
    useState<CreatedOrder | null>(
      null,
    );

  const [
    priceChangeNotice,
    setPriceChangeNotice,
  ] =
    useState<PriceChangeNotice | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<CustomerForm>({
      fullName: "",
      mobile: "",
      email: "",
      province: "",
      city: "",
      postalCode: "",
      address: "",
    });

  const quoteRef =
    useRef<CartQuoteResponse | null>(
      null,
    );

  const quoteRequestRef =
    useRef<AbortController | null>(
      null,
    );

  const noticeTimerRef =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);

  const idempotencyRef =
    useRef<{
      fingerprint: string;
      key: string;
    } | null>(null);

  const formatPrice =
    useCallback(
      (value: string) => {
        try {
          return new Intl.NumberFormat(
            isPersian
              ? "fa-IR"
              : "en-US",
          ).format(
            BigInt(value),
          );
        } catch {
          return value;
        }
      },
      [isPersian],
    );

  const formatNumber =
    useCallback(
      (value: number) =>
        value.toLocaleString(
          isPersian
            ? "fa-IR"
            : "en-US",
        ),
      [isPersian],
    );

  const formatDateTime =
    useCallback(
      (value: string) => {
        const date =
          new Date(value);

        if (
          Number.isNaN(
            date.getTime(),
          )
        ) {
          return "";
        }

        return new Intl.DateTimeFormat(
          isPersian
            ? "fa-IR"
            : "en-US",
          {
            dateStyle:
              "medium",

            timeStyle:
              "short",
          },
        ).format(date);
      },
      [isPersian],
    );

  const dismissPriceNotice =
    useCallback(() => {
      if (
        noticeTimerRef.current
      ) {
        clearTimeout(
          noticeTimerRef.current,
        );

        noticeTimerRef.current =
          null;
      }

      setPriceChangeNotice(null);
    }, []);

  const showPriceNotice =
    useCallback(
      (
        previousSubtotalToman:
          string,

        currentSubtotalToman:
          string,
      ) => {
        if (
          noticeTimerRef.current
        ) {
          clearTimeout(
            noticeTimerRef.current,
          );
        }

        setPriceChangeNotice({
          previousSubtotalToman,
          currentSubtotalToman,
        });

        noticeTimerRef.current =
          setTimeout(() => {
            noticeTimerRef.current =
              null;

            setPriceChangeNotice(
              null,
            );
          }, 10_000);
      },
      [],
    );

  const loadQuote =
    useCallback(
      async (
        items: CartItem[],
        options: {
          background?: boolean;
          notifyOnChange?: boolean;
        } = {},
      ): Promise<CartQuoteResponse | null> => {
        quoteRequestRef.current?.abort();

        if (
          items.length === 0
        ) {
          quoteRef.current =
            null;

          setQuote(null);
          setQuoteError(null);
          setQuoteLoading(false);

          return null;
        }

        const controller =
          new AbortController();

        quoteRequestRef.current =
          controller;

        if (
          !options.background
        ) {
          setQuoteLoading(true);
        }

        setQuoteError(null);

        try {
          const response =
            await fetch(
              "/api/cart/quote",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Accept:
                    "application/json",
                },

                cache:
                  "no-store",

                signal:
                  controller.signal,

                body:
                  JSON.stringify({
                    items,
                  }),
              },
            );

          const data: unknown =
            await response
              .json()
              .catch(
                () => null,
              );

          if (
            !response.ok ||
            !isCartQuoteResponse(
              data,
            )
          ) {
            throw new Error(
              getErrorMessage(
                data,
                text.genericError,
              ),
            );
          }

          const previousQuote =
            quoteRef.current;

          if (
            options.notifyOnChange &&
            previousQuote &&
            didQuotePriceChange(
              previousQuote,
              data,
            )
          ) {
            showPriceNotice(
              previousQuote.summary
                .subtotalToman,

              data.summary
                .subtotalToman,
            );
          }

          quoteRef.current =
            data;

          setQuote(data);
          setQuoteError(null);

          return data;
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return null;
          }

          const message =
            error instanceof Error
              ? error.message
              : text.genericError;

          setQuoteError(
            message,
          );

          return null;
        } finally {
          if (
            quoteRequestRef.current ===
            controller
          ) {
            quoteRequestRef.current =
              null;

            setQuoteLoading(false);
          }
        }
      },
      [
        showPriceNotice,
        text.genericError,
      ],
    );

 useEffect(() => {
  const timeoutId =
    window.setTimeout(
      () => {
        void loadQuote(
          storedItems,
        );
      },
      0,
    );

  return () => {
    window.clearTimeout(
      timeoutId,
    );
  };
}, [
  loadQuote,
  storedItems,
]);

  useEffect(() => {
    const handleLivePriceEvent =
      (event: Event) => {
        const customEvent =
          event as CustomEvent<CartLivePriceEventDetail>;

        const detail =
          customEvent.detail;

        if (!detail) {
          return;
        }

        if (
          detail.status ===
          "failed"
        ) {
          setLivePriceFailed(
            true,
          );

          return;
        }

        if (
          detail.status ===
          "success"
        ) {
          setLivePriceFailed(
            false,
          );

          void loadQuote(
            storedItems,
            {
              background:
                true,

              notifyOnChange:
                true,
            },
          );
        }
      };

    window.addEventListener(
      CART_LIVE_PRICE_EVENT,
      handleLivePriceEvent,
    );

    return () => {
      window.removeEventListener(
        CART_LIVE_PRICE_EVENT,
        handleLivePriceEvent,
      );
    };
  }, [
    loadQuote,
    storedItems,
  ]);

  useEffect(() => {
    const fingerprint =
      getCartFingerprint(
        storedItems,
      );

    if (
      idempotencyRef.current &&
      idempotencyRef.current
        .fingerprint !==
        fingerprint
    ) {
      idempotencyRef.current =
        null;

      setCreatedOrder(null);
    }
  }, [
    storedItems,
  ]);

  useEffect(() => {
    return () => {
      quoteRequestRef.current?.abort();

      if (
        noticeTimerRef.current
      ) {
        clearTimeout(
          noticeTimerRef.current,
        );
      }
    };
  }, []);

  const getIdempotencyKey =
    useCallback(() => {
      const fingerprint =
        getCartFingerprint(
          storedItems,
        );

      if (
        idempotencyRef.current
          ?.fingerprint ===
        fingerprint
      ) {
        return idempotencyRef.current
          .key;
      }

      const key =
        getOrCreateIdempotencyKey(
          storedItems,
        );

      idempotencyRef.current =
        {
          fingerprint,
          key,
        };

      return key;
    }, [
      storedItems,
    ]);

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        submitting ||
        createdOrder
      ) {
        return;
      }

      setSubmitError(null);

      let normalizedCustomer:
        CheckoutCustomerInput;

      try {
        normalizedCustomer =
          normalizeCheckoutCustomer({
            fullName:
              form.fullName,

            mobile:
              form.mobile,

            email:
              form.email,

            province:
              form.province,

            city:
              form.city,

            postalCode:
              form.postalCode,

            address:
              form.address,
          });
      } catch (error) {
        setSubmitError(
          error instanceof
            CheckoutCustomerError
            ? error.message
            : text.genericError,
        );

        return;
      }

      if (
        storedItems.length ===
        0
      ) {
        setSubmitError(
          text.emptyDescription,
        );

        return;
      }

      setSubmitting(true);

      try {
        const previousQuote =
          quoteRef.current;

        const currentQuote =
          await loadQuote(
            storedItems,
          );

        if (!currentQuote) {
          setSubmitError(
            text.genericError,
          );

          return;
        }

        if (
          !currentQuote.summary
            .canCheckout
        ) {
          setSubmitError(
            text.unavailable,
          );

          return;
        }

        if (
          previousQuote &&
          didQuotePriceChange(
            previousQuote,
            currentQuote,
          )
        ) {
          showPriceNotice(
            previousQuote.summary
              .subtotalToman,

            currentQuote.summary
              .subtotalToman,
          );

          setSubmitError(
            text.changedBeforeSubmit,
          );

          return;
        }

        const response =
          await fetch(
            "/api/checkout/orders",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              cache:
                "no-store",

              body:
                JSON.stringify({
                  idempotencyKey:
                    getIdempotencyKey(),

                  locale,

                  customer:
                    normalizedCustomer,

                  items:
                    storedItems.map(
                      (item) => ({
                        slug:
                          item.slug,

                        variantId:
                          item.variantId,

                        quantity:
                          item.quantity,
                      }),
                    ),
                }),
            },
          );

        const data: unknown =
          await response
            .json()
            .catch(
              () => null,
            );

        if (
          !response.ok ||
          !isCreateOrderResponse(
            data,
          )
        ) {
          throw new Error(
            getErrorMessage(
              data,
              text.genericError,
            ),
          );
        }

        setCreatedOrder(
          data.order,
        );

        setSubmitError(null);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : text.genericError,
        );
      } finally {
        setSubmitting(false);
      }
    };

  const isEmpty =
    storedItems.length ===
    0;

  const checkoutBlocked =
    quoteLoading ||
    Boolean(
      quoteError,
    ) ||
    livePriceFailed ||
    !quote?.summary
      .canCheckout ||
    submitting ||
    Boolean(
      createdOrder,
    );

  if (
    !quoteLoading &&
    isEmpty
  ) {
    return (
      <section className="relative z-10 mx-auto flex min-h-[75vh] w-full max-w-[1100px] items-center justify-center px-4 pb-24 pt-36 sm:px-6">
        <div className="w-full max-w-2xl rounded-[2.5rem] border border-[#d9b85f]/20 bg-[linear-gradient(145deg,rgba(7,36,27,0.92),rgba(2,18,13,0.96))] px-6 py-16 text-center shadow-[0_35px_100px_rgba(0,0,0,0.3)] sm:px-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#d9b85f]/30 bg-[#d9b85f]/[0.07]">
            <ShoppingBag className="h-9 w-9 text-[#e3c46b]" />
          </div>

          <h1
            className={[
              "mt-7 text-[#f5e6c2]",
              isPersian
                ? `${persianTitleClassName} pb-3 text-3xl font-semibold leading-[1.9] sm:text-4xl`
                : "text-3xl font-semibold",
            ].join(" ")}
          >
            {text.emptyTitle}
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-8 text-[#cbbd9d]/65">
            {
              text.emptyDescription
            }
          </p>

          <Link
            href={`/${locale}/products`}
            className="mx-auto mt-9 inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#d9b85f]/45 bg-[#d9b85f]/[0.09] px-7 text-sm text-[#f1d98e] transition hover:-translate-y-0.5 hover:border-[#eed37f]/80 hover:bg-[#d9b85f]/[0.14]"
          >
            {text.products}

            {isPersian ? (
              <ArrowLeft className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-28 pt-36 sm:px-6 lg:px-10 lg:pt-40">
      {priceChangeNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 top-24 z-[100] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[#d9b85f]/35 bg-[linear-gradient(145deg,rgba(8,42,31,0.98),rgba(2,23,16,0.99))] p-4 shadow-[0_25px_90px_rgba(0,0,0,0.52)] backdrop-blur-xl sm:right-6 sm:w-full"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d9b85f]/30 bg-[#d9b85f]/[0.08] text-[#ead27e]">
              <RefreshCw className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#f4e5bd]">
                {
                  text.priceUpdated
                }
              </p>

              <p className="mt-1 text-xs leading-6 text-[#d2c4a4]/65">
                {
                  text.priceUpdatedDescription
                }
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2">
                  <p className="text-[9px] text-[#c9bb9a]/45">
                    {
                      text.previousAmount
                    }
                  </p>

                  <p className="mt-1 text-xs text-[#d8caa8]/70">
                    {formatPrice(
                      priceChangeNotice
                        .previousSubtotalToman,
                    )}{" "}
                    {
                      text.toman
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-[#d9b85f]/15 bg-[#d9b85f]/[0.04] px-3 py-2">
                  <p className="text-[9px] text-[#c9bb9a]/45">
                    {
                      text.currentAmount
                    }
                  </p>

                  <p className="mt-1 text-xs font-medium text-[#efd985]">
                    {formatPrice(
                      priceChangeNotice
                        .currentSubtotalToman,
                    )}{" "}
                    {
                      text.toman
                    }
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label={
                text.dismiss
              }
              onClick={
                dismissPriceNotice
              }
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#d5c8a8]/45 transition hover:bg-white/[0.06] hover:text-[#f1e4c3]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <header className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d9b85f]/30 bg-[#d9b85f]/[0.07]">
          <ShieldCheck className="h-7 w-7 text-[#e3c46b]" />
        </div>

        <p className="mt-5 text-[9px] uppercase tracking-[0.45em] text-[#d6b965]/55">
          {text.eyebrow}
        </p>

        <h1
          className={[
            "mt-3 text-[#f6e8c6]",
            isPersian
              ? `${persianTitleClassName} pb-3 text-3xl font-semibold leading-[1.9] sm:text-4xl`
              : "text-3xl font-semibold sm:text-4xl",
          ].join(" ")}
        >
          {text.title}
        </h1>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-8 text-[#cbbd9d]/60">
          {text.description}
        </p>
      </header>

      {(quoteError ||
        livePriceFailed) && (
        <div className="mx-auto mt-8 flex max-w-3xl items-start gap-4 rounded-2xl border border-red-300/20 bg-red-300/[0.06] px-5 py-4 text-sm text-red-100/80">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="flex-1">
            <p>
              {quoteError ??
                text.rateFailed}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadQuote(
                  storedItems,
                )
              }
              className="mt-3 inline-flex items-center gap-2 text-xs text-[#efd98e] transition hover:text-[#fff0bd]"
            >
              <RefreshCw className="h-3.5 w-3.5" />

              {text.retry}
            </button>
          </div>
        </div>
      )}

      {quoteLoading &&
        !quote ? (
          <div className="mt-16 flex items-center justify-center gap-3 text-sm text-[#d2c29d]/65">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#dec36f]" />

            {text.loading}
          </div>
        ) : (
          quote && (
            <form
              onSubmit={
                handleSubmit
              }
              className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]"
            >
              <div className="space-y-6">
                <section className="rounded-[2rem] border border-[#d9b85f]/20 bg-[linear-gradient(145deg,rgba(7,35,27,0.92),rgba(3,21,15,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-7">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d9b85f]/25 bg-[#d9b85f]/[0.06]">
                      <UserRound className="h-5 w-5 text-[#e2c872]" />
                    </div>

                    <div>
                      <h2 className="text-lg font-medium text-[#f1e2bd]">
                        {
                          text.customerTitle
                        }
                      </h2>

                      <p className="mt-1 text-xs leading-6 text-[#c9bb9a]/55">
                        {
                          text.customerDescription
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs text-[#d7c9a7]/65">
                        {
                          text.fullName
                        }
                      </span>

                      <input
                        required
                        autoComplete="name"
                        value={
                          form.fullName
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              fullName:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder={
                          text.fullNamePlaceholder
                        }
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#d9b85f]/45 focus:bg-[#d9b85f]/[0.025]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs text-[#d7c9a7]/65">
                        {
                          text.mobile
                        }
                      </span>

                      <input
                        required
                        dir="ltr"
                        inputMode="tel"
                        autoComplete="tel"
                        value={
                          form.mobile
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              mobile:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder={
                          text.mobilePlaceholder
                        }
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-left text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#d9b85f]/45 focus:bg-[#d9b85f]/[0.025]"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-xs text-[#d7c9a7]/65">
                        {
                          text.email
                        }
                      </span>

                      <input
                        dir="ltr"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={
                          form.email
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              email:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder={
                          text.emailPlaceholder
                        }
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-left text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#d9b85f]/45 focus:bg-[#d9b85f]/[0.025]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs text-[#d7c9a7]/65">
                        {
                          text.province
                        }
                      </span>

                      <input
                        required
                        autoComplete="address-level1"
                        value={
                          form.province
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              province:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder={
                          text.provincePlaceholder
                        }
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#d9b85f]/45 focus:bg-[#d9b85f]/[0.025]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs text-[#d7c9a7]/65">
                        {
                          text.city
                        }
                      </span>

                      <input
                        required
                        autoComplete="address-level2"
                        value={
                          form.city
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              city:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder={
                          text.cityPlaceholder
                        }
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#d9b85f]/45 focus:bg-[#d9b85f]/[0.025]"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-xs text-[#d7c9a7]/65">
                        {
                          text.postalCode
                        }
                      </span>

                      <input
                        required
                        dir="ltr"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={10}
                        value={
                          form.postalCode
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              postalCode:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder={
                          text.postalCodePlaceholder
                        }
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-left text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#d9b85f]/45 focus:bg-[#d9b85f]/[0.025]"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-xs text-[#d7c9a7]/65">
                        {
                          text.address
                        }
                      </span>

                      <textarea
                        required
                        rows={5}
                        autoComplete="street-address"
                        value={
                          form.address
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              address:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder={
                          text.addressPlaceholder
                        }
                        className="w-full resize-y rounded-xl border border-white/[0.09] bg-black/10 px-4 py-3 text-sm leading-7 text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#d9b85f]/45 focus:bg-[#d9b85f]/[0.025]"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-[#d9b85f]/20 bg-[linear-gradient(145deg,rgba(7,35,27,0.92),rgba(3,21,15,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-7">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-5 w-5 text-[#dfc46d]" />

                    <h2 className="text-lg font-medium text-[#f1e2bd]">
                      {
                        text.summary
                      }
                    </h2>
                  </div>

                  <div className="mt-6 divide-y divide-white/[0.07]">
                    {quote.items.map(
                      (item) => {
                        const productName =
                          isPersian
                            ? item.product
                                .nameFa
                            : item.product
                                .nameEn;

                        const variantName =
                          item.variant
                            ? isPersian
                              ? item.variant
                                  .titleFa
                              : item.variant
                                  .titleEn
                            : null;

                        return (
                          <div
                            key={
                              getItemKey(
                                item,
                              )
                            }
                            className="flex items-start justify-between gap-5 py-4 first:pt-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <Link
                                href={`/${locale}/products/${item.slug}`}
                                className="text-sm text-[#eee0bd] transition hover:text-[#f2d678]"
                              >
                                {
                                  productName
                                }
                              </Link>

                              {variantName && (
                                <p className="mt-1 text-[10px] text-[#cabc9a]/45">
                                  {
                                    variantName
                                  }
                                </p>
                              )}

                              <p className="mt-2 text-[10px] text-[#cabc9a]/45">
                                {
                                  text.quantity
                                }
                                :{" "}
                                {formatNumber(
                                  item.quantity,
                                )}
                              </p>
                            </div>

                            <div className="shrink-0 text-end">
                              <p className="text-sm font-medium text-[#ecd078]">
                                {formatPrice(
                                  item.pricing
                                    .lineTotalToman,
                                )}
                              </p>

                              <p className="mt-1 text-[9px] text-[#cabc9a]/45">
                                {
                                  text.toman
                                }
                              </p>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </section>
              </div>

              <aside className="lg:sticky lg:top-28">
                <div className="rounded-[2rem] border border-[#d9b85f]/25 bg-[linear-gradient(150deg,rgba(9,39,29,0.97),rgba(3,21,15,0.99))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.3)]">
                  {createdOrder ? (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-200/[0.07] text-emerald-200">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>

                      <h2 className="mt-5 text-xl font-medium text-[#f2e1bb]">
                        {
                          text.orderCreated
                        }
                      </h2>

                      <div className="mt-6 space-y-4 border-y border-white/[0.07] py-6">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-[#c9bb9a]/55">
                            {
                              text.orderNumber
                            }
                          </span>

                          <span
                            dir="ltr"
                            className="text-xs text-[#efd985]"
                          >
                            {
                              createdOrder.orderNumber
                            }
                          </span>
                        </div>

                        <div className="flex items-end justify-between gap-4">
                          <span className="text-sm text-[#c9bb9a]/55">
                            {
                              text.verifiedAmount
                            }
                          </span>

                          <div className="text-end">
                            <span className="text-xl font-semibold text-[#f0d477]">
                              {formatPrice(
                                createdOrder
                                  .payableToman,
                              )}
                            </span>

                            <span className="ms-2 text-[10px] text-[#c9bb9a]/45">
                              {
                                text.toman
                              }
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-4 text-xs">
                          <span className="text-[#c9bb9a]/55">
                            {
                              text.reservedUntil
                            }
                          </span>

                          <span className="text-end leading-6 text-[#e0cb8a]/70">
                            {formatDateTime(
                              createdOrder
                                .inventoryExpiresAt,
                            )}
                          </span>
                        </div>
                      </div>

                      <p className="mt-5 text-xs leading-7 text-amber-100/55">
                        {
                          text.gatewayPending
                        }
                      </p>

                      <button
                        type="button"
                        disabled
                        className="mt-6 flex min-h-13 w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-[#e0c16d]/25 bg-[#d9b85f]/[0.05] px-6 text-sm text-[#f6e4af]/40"
                      >
                        <WalletCards className="h-4 w-4" />

                        {
                          text.gatewayButton
                        }
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-[9px] uppercase tracking-[0.4em] text-[#d7ba67]/50">
                        Eloria Order
                      </p>

                      <h2 className="mt-3 text-xl font-medium text-[#f2e1bb]">
                        {
                          text.summary
                        }
                      </h2>

                      <div className="mt-7 space-y-4 border-y border-white/[0.07] py-6">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-[#c9bb9a]/60">
                            {
                              text.quantity
                            }
                          </span>

                          <span className="text-[#eee1c7]">
                            {formatNumber(
                              quote.summary
                                .totalQuantity,
                            )}
                          </span>
                        </div>

                        <div className="flex items-end justify-between gap-4">
                          <span className="text-sm text-[#c9bb9a]/60">
                            {
                              text.payable
                            }
                          </span>

                          <div className="text-end">
                            <span className="text-xl font-semibold text-[#f0d477]">
                              {formatPrice(
                                quote.summary
                                  .subtotalToman,
                              )}
                            </span>

                            <span className="ms-2 text-[10px] text-[#c9bb9a]/50">
                              {
                                text.toman
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 text-[10px] text-[#c9bb9a]/45">
                        <span>
                          {
                            text.lastChecked
                          }
                        </span>

                        <span
                          dir="ltr"
                          className="text-[#dfc87e]/65"
                        >
                          {formatDateTime(
                            quote.generatedAt,
                          )}
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        <div className="flex items-start gap-3 rounded-xl border border-[#d9b85f]/12 bg-[#d9b85f]/[0.03] px-3 py-3 text-[10px] leading-6 text-[#cfc19e]/55">
                          <ShieldCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-[#d9be6b]/65" />

                          {
                            text.secureNotice
                          }
                        </div>

                        <div className="flex items-start gap-3 rounded-xl border border-[#d9b85f]/12 bg-[#d9b85f]/[0.03] px-3 py-3 text-[10px] leading-6 text-[#cfc19e]/55">
                          <Clock3 className="mt-1 h-3.5 w-3.5 shrink-0 text-[#d9be6b]/65" />

                          {
                            text.reservationNotice
                          }
                        </div>
                      </div>

                      {submitError && (
                        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-300/[0.055] px-4 py-3 text-xs leading-6 text-red-100/75">
                          <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />

                          <span>
                            {
                              submitError
                            }
                          </span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={
                          checkoutBlocked
                        }
                        className="mt-6 flex min-h-13 w-full items-center justify-center gap-3 rounded-full border border-[#e0c16d]/55 bg-[linear-gradient(100deg,rgba(112,80,20,0.22),rgba(218,183,90,0.3),rgba(112,80,20,0.22))] px-6 text-sm font-medium text-[#f6e4af] transition hover:-translate-y-0.5 hover:border-[#f0d681]/85 hover:shadow-[0_0_30px_rgba(218,183,91,0.14)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
                      >
                        {submitting ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <WalletCards className="h-4 w-4" />
                        )}

                        {submitting
                          ? text.submitting
                          : text.submit}
                      </button>

                      <Link
                        href={`/${locale}/cart`}
                        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/[0.08] text-xs text-[#cfc19e]/60 transition hover:border-[#d9b85f]/25 hover:text-[#efd98e]"
                      >
                        {isPersian ? (
                          <ArrowRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowLeft className="h-3.5 w-3.5" />
                        )}

                        {
                          text.cart
                        }
                      </Link>
                    </>
                  )}
                </div>
              </aside>
            </form>
          )
        )}
    </section>
  );
}