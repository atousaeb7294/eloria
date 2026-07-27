"use client";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  LoaderCircle,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CART_LIVE_PRICE_EVENT,
  type CartLivePriceEventDetail,
} from "@/components/cart-live-price-refresh";

import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  readCartItems,
  removeCartItem,
  updateCartItemQuantity,
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
    material:
      | "GOLD"
      | "SILVER";
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

  image: {
    url: string;
    altFa: string | null;
    altEn: string | null;
  } | null;

  pricing: {
    currency:
      "TOMAN";
    unitPriceToman:
      string;
    lineTotalToman:
      string;
  };

  canPurchase: boolean;

  unavailableReason:
    string | null;
};

type FailedCartItem = {
  slug: string;
  variantId: string | null;
  quantity: number;
  code: string;
  message: string;
};

type CartQuoteSummary = {
  uniqueItems: number;
  totalQuantity: number;
  subtotalToman: string;
  canCheckout: boolean;
};

type CartQuoteResponse = {
  successful: true;

  currency:
    "TOMAN";

  items:
    QuotedCartItem[];

  failedItems:
    FailedCartItem[];

  summary:
    CartQuoteSummary;

  generatedAt:
    string;
};

type LivePriceState =
  | "idle"
  | "refreshing"
  | "success"
  | "failed";

type CartPageClientProps = {
  locale: string;

  persianTitleClassName:
    string;
};

function isCartQuoteResponse(
  value: unknown,
): value is CartQuoteResponse {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<CartQuoteResponse>;

  if (
    candidate.successful !==
      true ||
    !Array.isArray(
      candidate.items,
    ) ||
    !Array.isArray(
      candidate.failedItems,
    ) ||
    typeof candidate.summary !==
      "object" ||
    candidate.summary ===
      null ||
    typeof candidate.generatedAt !==
      "string"
  ) {
    return false;
  }

  return true;
}

function isSameItem(
  first: {
    slug: string;
    variantId:
      string | null;
  },
  second: {
    slug: string;
    variantId:
      string | null;
  },
) {
  return (
    first.slug ===
      second.slug &&
    first.variantId ===
      second.variantId
  );
}

function calculateSummary(
  items:
    QuotedCartItem[],
  failedItems:
    FailedCartItem[],
): CartQuoteSummary {
  const subtotalToman =
    items.reduce(
      (
        total,
        item,
      ) => {
        if (
          !item.canPurchase
        ) {
          return total;
        }

        try {
          return (
            total +
            BigInt(
              item.pricing
                .lineTotalToman,
            )
          );
        } catch {
          return total;
        }
      },
      BigInt(0),
    );

  const totalQuantity =
    items.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantity,
      0,
    );

  return {
    uniqueItems:
      items.length,

    totalQuantity,

    subtotalToman:
      subtotalToman.toString(),

    canCheckout:
      items.length > 0 &&
      failedItems.length ===
        0 &&
      items.every(
        (item) =>
          item.canPurchase,
      ),
  };
}

export function CartPageClient({
  locale,
  persianTitleClassName,
}: CartPageClientProps) {
  const isPersian =
    locale === "fa";

  const [
    storedItems,
    setStoredItems,
  ] = useState<CartItem[]>(
    [],
  );

  const [
    quote,
    setQuote,
  ] =
    useState<CartQuoteResponse | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    livePriceState,
    setLivePriceState,
  ] =
    useState<LivePriceState>(
      "idle",
    );

  const [
    livePriceMessage,
    setLivePriceMessage,
  ] =
    useState<string | null>(
      null,
    );

  const requestIdRef =
    useRef(0);

  const requestControllerRef =
    useRef<AbortController | null>(
      null,
    );

  const quoteTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const text =
    isPersian
      ? {
          title:
            "سبد خرید",

          eyebrow:
            "Eloria Shopping Bag",

          description:
            "قیمت و موجودی محصولات مستقیماً از سرور الوریا بررسی می‌شود.",

          emptyTitle:
            "سبد خرید شما خالی است",

          emptyDescription:
            "هنوز محصولی به سبد خرید اضافه نکرده‌اید.",

          products:
            "مشاهده محصولات",

          quantity:
            "تعداد",

          unitPrice:
            "قیمت هر واحد",

          lineTotal:
            "مجموع محصول",

          remove:
            "حذف",

          summary:
            "خلاصه سفارش",

          itemCount:
            "تعداد محصولات",

          subtotal:
            "جمع کل",

          toman:
            "تومان",

          checkout:
            "ادامه فرایند خرید",

          unavailable:
            "این محصول در حال حاضر قابل سفارش نیست.",

          insufficientStock:
            "موجودی این محصول برای تعداد انتخاب‌شده کافی نیست.",

          quoteFailed:
            "دریافت قیمت این محصول انجام نشد.",

          retry:
            "بررسی دوباره",

          loading:
            "در حال بررسی قیمت و موجودی...",

          securePricing:
            "قیمت نهایی هنگام پرداخت دوباره با آخرین نرخ زنده بررسی می‌شود.",

          checkoutBlocked:
            "برای ادامه خرید، مشکلات سبد را برطرف کنید.",

          genericError:
            "دریافت اطلاعات سبد خرید امکان‌پذیر نیست.",

          variant:
            "مدل",

          material:
            "جنس",

          gold:
            "طلا",

          silver:
            "نقره",

          liveConnecting:
            "در حال اتصال به آخرین نرخ زنده",

          liveReady:
            "قیمت‌ها با آخرین نرخ بررسی شدند",

          liveFailed:
            "اتصال به نرخ زنده برقرار نشد؛ قیمت موجود نمایش داده می‌شود.",

          checkedAt:
            "آخرین بررسی",
        }
      : {
          title:
            "Shopping Bag",

          eyebrow:
            "Eloria Shopping Bag",

          description:
            "Prices and availability are verified directly by Eloria servers.",

          emptyTitle:
            "Your shopping bag is empty",

          emptyDescription:
            "You have not added any products yet.",

          products:
            "Explore products",

          quantity:
            "Quantity",

          unitPrice:
            "Unit price",

          lineTotal:
            "Item total",

          remove:
            "Remove",

          summary:
            "Order summary",

          itemCount:
            "Items",

          subtotal:
            "Subtotal",

          toman:
            "Toman",

          checkout:
            "Continue to checkout",

          unavailable:
            "This product is currently unavailable.",

          insufficientStock:
            "There is not enough stock for the selected quantity.",

          quoteFailed:
            "The price for this product could not be retrieved.",

          retry:
            "Check again",

          loading:
            "Checking prices and availability...",

          securePricing:
            "The final price will be verified again against the latest live rate at checkout.",

          checkoutBlocked:
            "Resolve the cart issues before continuing.",

          genericError:
            "Unable to retrieve shopping bag information.",

          variant:
            "Variant",

          material:
            "Material",

          gold:
            "Gold",

          silver:
            "Silver",

          liveConnecting:
            "Connecting to the latest live rate",

          liveReady:
            "Prices verified against the latest rate",

          liveFailed:
            "Live-rate connection failed; the available price is being shown.",

          checkedAt:
            "Last checked",
        };

  const formatNumber = (
    value: number,
  ) =>
    value.toLocaleString(
      isPersian
        ? "fa-IR"
        : "en-US",
    );

  const formatPrice = (
    value: string,
  ) => {
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
  };

  const formatTime = (
    value: string,
  ) => {
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
        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",
      },
    ).format(date);
  };

  const loadQuote =
    useCallback(
      async (
        items:
          CartItem[],
      ) => {
        const requestId =
          requestIdRef.current +
          1;

        requestIdRef.current =
          requestId;

        requestControllerRef.current?.abort();

        if (
          items.length ===
          0
        ) {
          setQuote(null);
          setError(null);
          setLoading(false);

          return;
        }

        const controller =
          new AbortController();

        requestControllerRef.current =
          controller;

        setLoading(true);
        setError(null);

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
            let message =
              text.genericError;

            if (
              typeof data ===
                "object" &&
              data !== null &&
              "message" in
                data &&
              typeof data.message ===
                "string"
            ) {
              message =
                data.message;
            }

            throw new Error(
              message,
            );
          }

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          setQuote(data);
          setError(null);
        } catch (
          requestError
        ) {
          if (
            requestError instanceof
              DOMException &&
            requestError.name ===
              "AbortError"
          ) {
            return;
          }

          if (
            requestId !==
            requestIdRef.current
          ) {
            return;
          }

          setError(
            requestError instanceof
              Error
              ? requestError.message
              : text.genericError,
          );
        } finally {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setLoading(false);

            if (
              requestControllerRef.current ===
              controller
            ) {
              requestControllerRef.current =
                null;
            }
          }
        }
      },
      [
        text.genericError,
      ],
    );

  const scheduleQuote =
    useCallback(
      (
        items:
          CartItem[],

        immediate =
          false,
      ) => {
        if (
          quoteTimerRef.current
        ) {
          clearTimeout(
            quoteTimerRef.current,
          );

          quoteTimerRef.current =
            null;
        }

        if (immediate) {
          void loadQuote(
            items,
          );

          return;
        }

        quoteTimerRef.current =
          setTimeout(
            () => {
              quoteTimerRef.current =
                null;

              void loadQuote(
                items,
              );
            },
            100,
          );
      },
      [
        loadQuote,
      ],
    );

  const syncFromStorage =
    useCallback(
      (
        immediate =
          false,
      ) => {
        const items =
          readCartItems();

        setStoredItems(
          items,
        );

        scheduleQuote(
          items,
          immediate,
        );
      },
      [
        scheduleQuote,
      ],
    );

  useEffect(() => {
    syncFromStorage(true);

    const handleCartUpdate =
      () => {
        syncFromStorage(
          false,
        );
      };

    const handleStorage = (
      event:
        StorageEvent,
    ) => {
      if (
        event.key ===
          CART_STORAGE_KEY ||
        event.key ===
          null
      ) {
        syncFromStorage(
          false,
        );
      }
    };

    const handleLivePriceEvent =
      (
        event:
          Event,
      ) => {
        const customEvent =
          event as CustomEvent<CartLivePriceEventDetail>;

        const detail =
          customEvent.detail;

        if (!detail) {
          return;
        }

        setLivePriceState(
          detail.status,
        );

        setLivePriceMessage(
          detail.message ??
            null,
        );
      };

    window.addEventListener(
      CART_UPDATED_EVENT,
      handleCartUpdate,
    );

    window.addEventListener(
      "storage",
      handleStorage,
    );

    window.addEventListener(
      CART_LIVE_PRICE_EVENT,
      handleLivePriceEvent,
    );

    return () => {
      window.removeEventListener(
        CART_UPDATED_EVENT,
        handleCartUpdate,
      );

      window.removeEventListener(
        "storage",
        handleStorage,
      );

      window.removeEventListener(
        CART_LIVE_PRICE_EVENT,
        handleLivePriceEvent,
      );

      if (
        quoteTimerRef.current
      ) {
        clearTimeout(
          quoteTimerRef.current,
        );
      }

      requestControllerRef.current?.abort();
    };
  }, [
    syncFromStorage,
  ]);

  const updateQuoteOptimistically =
    useCallback(
      ({
        slug,
        variantId,
        quantity,
      }: {
        slug:
          string;

        variantId:
          string | null;

        quantity:
          number;
      }) => {
        setQuote(
          (
            current,
          ) => {
            if (!current) {
              return current;
            }

            const target = {
              slug,
              variantId,
            };

            const nextItems =
              quantity <= 0
                ? current.items.filter(
                    (
                      item,
                    ) =>
                      !isSameItem(
                        item,
                        target,
                      ),
                  )
                : current.items.map(
                    (
                      item,
                    ) => {
                      if (
                        !isSameItem(
                          item,
                          target,
                        )
                      ) {
                        return item;
                      }

                      let lineTotalToman =
                        item.pricing
                          .lineTotalToman;

                      try {
                        lineTotalToman =
                          (
                            BigInt(
                              item.pricing
                                .unitPriceToman,
                            ) *
                            BigInt(
                              quantity,
                            )
                          ).toString();
                      } catch {
                        // قیمت اصلی تا دریافت پاسخ سرور حفظ می‌شود.
                      }

                      const availableStock =
                        item.variant
                          ?.stock ??
                        item.product
                          .stock;

                      const hasEnoughStock =
                        availableStock >=
                        quantity;

                      const canPurchase =
                        item.product
                          .isPurchasable &&
                        hasEnoughStock;

                      return {
                        ...item,

                        quantity,

                        canPurchase,

                        unavailableReason:
                          !item.product
                            .isPurchasable
                            ? "PRODUCT_UNAVAILABLE"
                            : hasEnoughStock
                              ? null
                              : "INSUFFICIENT_STOCK",

                        pricing: {
                          ...item.pricing,

                          lineTotalToman,
                        },
                      };
                    },
                  );

            const nextFailedItems =
              quantity <= 0
                ? current.failedItems.filter(
                    (
                      item,
                    ) =>
                      !isSameItem(
                        item,
                        target,
                      ),
                  )
                : current.failedItems.map(
                    (
                      item,
                    ) =>
                      isSameItem(
                        item,
                        target,
                      )
                        ? {
                            ...item,
                            quantity,
                          }
                        : item,
                  );

            return {
              ...current,

              items:
                nextItems,

              failedItems:
                nextFailedItems,

              summary:
                calculateSummary(
                  nextItems,
                  nextFailedItems,
                ),
            };
          },
        );
      },
      [],
    );

  const changeQuantity = (
    item:
      QuotedCartItem,

    requestedQuantity:
      number,
  ) => {
    const availableStock =
      item.variant
        ?.stock ??
      item.product
        .stock;

    const safeQuantity =
      Math.min(
        Math.max(
          Math.trunc(
            requestedQuantity,
          ),
          0,
        ),
        Math.max(
          availableStock,
          0,
        ),
        99,
      );

    updateQuoteOptimistically({
      slug:
        item.slug,

      variantId:
        item.variantId,

      quantity:
        safeQuantity,
    });

    updateCartItemQuantity({
      slug:
        item.slug,

      variantId:
        item.variantId,

      quantity:
        safeQuantity,
    });
  };

  const removeItem = ({
    slug,
    variantId,
  }: {
    slug: string;

    variantId:
      string | null;
  }) => {
    updateQuoteOptimistically({
      slug,
      variantId,
      quantity: 0,
    });

    removeCartItem({
      slug,
      variantId,
    });
  };

  const getUnavailableText = (
    reason:
      string | null,
  ) => {
    if (
      reason ===
      "INSUFFICIENT_STOCK"
    ) {
      return text.insufficientStock;
    }

    return text.unavailable;
  };

  const isEmpty =
    storedItems.length ===
    0;

  const liveStatusContent =
    livePriceState ===
      "refreshing"
      ? {
          icon:
            "loading" as const,

          text:
            text.liveConnecting,

          className:
            "border-[#d9b85f]/20 bg-[#d9b85f]/[0.06] text-[#dbc783]/70",
        }
      : livePriceState ===
          "failed"
        ? {
            icon:
              "warning" as const,

            text:
              livePriceMessage ??
              text.liveFailed,

            className:
              "border-amber-300/20 bg-amber-200/[0.05] text-amber-100/60",
          }
        : {
            icon:
              "success" as const,

            text:
              quote
                ? text.liveReady
                : text.loading,

            className:
              "border-emerald-300/15 bg-emerald-200/[0.04] text-emerald-100/55",
          };

  if (
    !loading &&
    isEmpty
  ) {
    return (
      <section className="relative z-10 mx-auto flex min-h-[75vh] w-full max-w-[1100px] items-center justify-center px-4 pb-24 pt-36 sm:px-6">
        <div className="w-full max-w-2xl rounded-[2.5rem] border border-[#d9b85f]/20 bg-[linear-gradient(145deg,rgba(7,36,27,0.9),rgba(2,18,13,0.94))] px-6 py-16 text-center shadow-[0_35px_100px_rgba(0,0,0,0.28)] sm:px-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#d9b85f]/30 bg-[#d9b85f]/[0.07]">
            <ShoppingBag className="h-9 w-9 text-[#e3c46b]" />
          </div>

          <p className="mt-7 text-[9px] uppercase tracking-[0.42em] text-[#d6b965]/55">
            {text.eyebrow}
          </p>

          <h1
            className={[
              "mt-4 text-[#f5e6c2]",
              isPersian
                ? `${persianTitleClassName} pb-3 text-3xl font-semibold leading-[1.9] sm:text-4xl`
                : "text-2xl font-semibold sm:text-3xl",
            ].join(" ")}
          >
            {text.emptyTitle}
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-8 text-[#cbbd9d]/65">
            {text.emptyDescription}
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
      <header className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d9b85f]/30 bg-[#d9b85f]/[0.07]">
          <ShoppingBag className="h-7 w-7 text-[#e3c46b]" />
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

        <p className="mx-auto mt-1 max-w-2xl text-sm leading-8 text-[#cbbd9d]/65">
          {text.description}
        </p>

        <div className="mt-5 flex justify-center">
          <div
            className={[
              "inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-[10px] leading-5 transition",
              liveStatusContent.className,
            ].join(" ")}
          >
            {liveStatusContent.icon ===
            "loading" ? (
              <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : liveStatusContent.icon ===
              "warning" ? (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <CircleCheck className="h-3.5 w-3.5 shrink-0" />
            )}

            <span>
              {
                liveStatusContent.text
              }
            </span>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-10 flex max-w-3xl items-start gap-4 rounded-2xl border border-red-300/20 bg-red-300/[0.06] px-5 py-4 text-sm text-red-100/80">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="flex-1">
            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                syncFromStorage(
                  true,
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

      {loading &&
        !quote && (
          <div className="mt-16 flex items-center justify-center gap-3 text-sm text-[#d2c29d]/65">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#dec36f]" />

            {text.loading}
          </div>
        )}

      {quote && (
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_370px]">
          <div className="space-y-5">
            {quote.items.map(
              (
                item,
              ) => {
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

                const material =
                  item.product
                    .material ===
                  "GOLD"
                    ? text.gold
                    : text.silver;

                const availableStock =
                  item.variant
                    ?.stock ??
                  item.product
                    .stock;

                return (
                  <article
                    key={`${item.slug}:${item.variantId ?? "default"}`}
                    className={[
                      "overflow-hidden rounded-[2rem] border bg-[linear-gradient(145deg,rgba(7,35,27,0.9),rgba(3,21,15,0.94))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.2)] transition sm:p-5",
                      item.canPurchase
                        ? "border-[#d8b860]/20"
                        : "border-amber-300/25",
                    ].join(" ")}
                  >
                    <div className="grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)]">
                      <div className="relative aspect-square overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-[#041b14]">
                        {item.image ? (
                          <img
                            src={
                              item.image
                                .url
                            }
                            alt={
                              (isPersian
                                ? item.image
                                    .altFa
                                : item.image
                                    .altEn) ??
                              productName
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-[#d9b85f]/35" />
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Link
                              href={`/${locale}/products/${item.slug}`}
                              className="text-lg font-medium text-[#f3e3be] transition hover:text-[#f7d981]"
                            >
                              {
                                productName
                              }
                            </Link>

                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-[#c8b992]/60">
                              <span>
                                {
                                  text.material
                                }
                                :{" "}
                                {
                                  material
                                }
                              </span>

                              {variantName && (
                                <span>
                                  {
                                    text.variant
                                  }
                                  :{" "}
                                  {
                                    variantName
                                  }
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            aria-label={
                              text.remove
                            }
                            onClick={() =>
                              removeItem({
                                slug:
                                  item.slug,

                                variantId:
                                  item.variantId,
                              })
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200/15 text-red-100/45 transition hover:border-red-200/35 hover:bg-red-200/[0.07] hover:text-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {!item.canPurchase && (
                          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-200/[0.05] px-3 py-2 text-[11px] leading-6 text-amber-100/70">
                            <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0" />

                            {getUnavailableText(
                              item.unavailableReason,
                            )}
                          </div>
                        )}

                        <div className="mt-5 grid gap-4 border-t border-white/[0.07] pt-5 sm:grid-cols-3">
                          <div>
                            <p className="text-[10px] text-[#c8b992]/45">
                              {
                                text.unitPrice
                              }
                            </p>

                            <p className="mt-1 text-sm text-[#ead597]">
                              {formatPrice(
                                item.pricing
                                  .unitPriceToman,
                              )}{" "}
                              <span className="text-[10px] text-[#c8b992]/50">
                                {
                                  text.toman
                                }
                              </span>
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#c8b992]/45">
                              {
                                text.quantity
                              }
                            </p>

                            <div className="mt-2 inline-flex items-center rounded-full border border-[#d8b860]/20 bg-black/10 p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  changeQuantity(
                                    item,
                                    item.quantity -
                                      1,
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-full text-[#d7c79f]/65 transition hover:bg-white/[0.06] hover:text-[#f4dfaa]"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>

                              <span className="min-w-9 text-center text-xs text-[#f3e4be]">
                                {formatNumber(
                                  item.quantity,
                                )}
                              </span>

                              <button
                                type="button"
                                disabled={
                                  item.quantity >=
                                    99 ||
                                  item.quantity >=
                                    availableStock
                                }
                                onClick={() =>
                                  changeQuantity(
                                    item,
                                    item.quantity +
                                      1,
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-full text-[#d7c79f]/65 transition hover:bg-white/[0.06] hover:text-[#f4dfaa] disabled:cursor-not-allowed disabled:opacity-25"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] text-[#c8b992]/45">
                              {
                                text.lineTotal
                              }
                            </p>

                            <p className="mt-1 text-sm font-medium text-[#f1d982]">
                              {formatPrice(
                                item.pricing
                                  .lineTotalToman,
                              )}{" "}
                              <span className="text-[10px] font-normal text-[#c8b992]/50">
                                {
                                  text.toman
                                }
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              },
            )}

            {quote.failedItems.map(
              (
                item,
              ) => (
                <article
                  key={`${item.slug}:${item.variantId ?? "default"}:failed`}
                  className="rounded-[1.5rem] border border-red-300/20 bg-red-300/[0.045] px-5 py-4"
                >
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-red-200/70" />

                    <div className="flex-1">
                      <p className="text-sm text-red-100/80">
                        {
                          text.quoteFailed
                        }
                      </p>

                      <p
                        dir="ltr"
                        className="mt-1 text-left text-xs text-red-100/45"
                      >
                        {item.slug}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem({
                            slug:
                              item.slug,

                            variantId:
                              item.variantId,
                          })
                        }
                        className="mt-3 inline-flex items-center gap-2 text-xs text-red-100/60 transition hover:text-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />

                        {
                          text.remove
                        }
                      </button>
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>

          <aside className="lg:sticky lg:top-28">
            <div className="rounded-[2rem] border border-[#d9b85f]/25 bg-[linear-gradient(150deg,rgba(9,39,29,0.95),rgba(3,21,15,0.98))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
              <p className="text-[9px] uppercase tracking-[0.4em] text-[#d7ba67]/50">
                Eloria Order
              </p>

              <h2 className="mt-3 text-xl font-medium text-[#f2e1bb]">
                {text.summary}
              </h2>

              <div className="mt-7 space-y-4 border-y border-white/[0.07] py-6">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[#c9bb9a]/60">
                    {
                      text.itemCount
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
                      text.subtotal
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
                    text.checkedAt
                  }
                </span>

                <span
                  dir="ltr"
                  className="text-[#dfc87e]/65"
                >
                  {formatTime(
                    quote.generatedAt,
                  )}
                </span>
              </div>

              <p className="mt-4 text-[10px] leading-6 text-[#c9bb9a]/50">
                {
                  text.securePricing
                }
              </p>

              <button
                type="button"
                disabled={
                  !quote.summary
                    .canCheckout ||
                  loading
                }
                onClick={() => {
                  window.location.assign(
                    `/${locale}/checkout`,
                  );
                }}
                className="mt-6 flex min-h-13 w-full items-center justify-center gap-3 rounded-full border border-[#e0c16d]/55 bg-[linear-gradient(100deg,rgba(112,80,20,0.22),rgba(218,183,90,0.3),rgba(112,80,20,0.22))] px-6 text-sm font-medium text-[#f6e4af] transition hover:-translate-y-0.5 hover:border-[#f0d681]/85 hover:shadow-[0_0_30px_rgba(218,183,91,0.14)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4" />
                )}

                {
                  text.checkout
                }
              </button>

              {!quote.summary
                .canCheckout && (
                <p className="mt-3 text-center text-[10px] leading-5 text-amber-100/45">
                  {
                    text.checkoutBlocked
                  }
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}