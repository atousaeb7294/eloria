"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CART_LIVE_PRICE_EVENT, type CartLivePriceEventDetail } from "@/components/cart-live-price-refresh";
import { removeCartItem, subscribeToCart, updateCartItemQuantity, type CartItem } from "@/lib/cart-storage";
import { calculateSummary, detectPriceChange, getCartSnapshot, getServerCartSnapshot, isCartQuoteResponse, isSameItem, parseCartSnapshot, type CartPageClientProps, type CartQuoteResponse, type LivePriceState, type PriceChangeNotice, type QuoteLoadOptions, type QuotedCartItem } from "@/components/cart/cart-page-model";

export function useCartPageController({
  locale,
}: CartPageClientProps) {
  const isPersian =
    locale === "fa";

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

  const [
    priceChangeNotice,
    setPriceChangeNotice,
  ] =
    useState<PriceChangeNotice | null>(
      null,
    );

  const quoteRef =
    useRef<CartQuoteResponse | null>(
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
      ReturnType<typeof setTimeout> | null
    >(null);

  const noticeTimerRef =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);

  const text =
    isPersian
      ? {
          title: "سبد خرید",
          eyebrow:
            "Eloria Shopping Bag",

          emptyTitle:
            "سبد خرید شما خالی است",

          emptyDescription:
            "هنوز محصولی به سبد خرید اضافه نکرده‌اید.",

          products:
            "مشاهده محصولات",

          quantity: "تعداد",
          unitPrice:
            "قیمت هر واحد",
          lineTotal:
            "مجموع محصول",
          remove: "حذف",
          summary:
            "خلاصه سفارش",
          itemCount:
            "تعداد محصولات",
          subtotal:
            "جمع کل",
          toman: "تومان",

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
            "قیمت نهایی هنگام پرداخت دوباره از سرور بررسی و محاسبه می‌شود.",

          checkoutBlocked:
            "برای ادامه خرید، مشکلات سبد را برطرف کنید.",

          genericError:
            "دریافت اطلاعات سبد خرید امکان‌پذیر نیست.",

          variant: "مدل",
          material: "جنس",
          gold: "طلا",
          silver: "نقره",

          liveFailed:
            "بررسی نرخ بازار انجام نشد. لطفاً دوباره تلاش کنید.",

          checkedAt:
            "آخرین بررسی",

          priceUpdated:
            "قیمت سبد خرید به‌روزرسانی شد",

          priceIncreased:
            "جمع سبد خرید افزایش یافت.",

          priceDecreased:
            "جمع سبد خرید کاهش یافت.",

          priceChanged:
            "قیمت محصولات سبد خرید تغییر کرد.",

          changedItems:
            "محصول دارای قیمت جدید",

          previousTotal:
            "مبلغ قبلی",

          currentTotal:
            "مبلغ جدید",

          dismiss:
            "بستن اعلان",
        }
      : {
          title:
            "Shopping Bag",

          eyebrow:
            "Eloria Shopping Bag",

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
            "The final price is recalculated and verified by the server before payment.",

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

          liveFailed:
            "The market rate could not be verified. Please try again.",

          checkedAt:
            "Last checked",

          priceUpdated:
            "Shopping bag price updated",

          priceIncreased:
            "The shopping bag total increased.",

          priceDecreased:
            "The shopping bag total decreased.",

          priceChanged:
            "Product prices in your shopping bag changed.",

          changedItems:
            "products have new prices",

          previousTotal:
            "Previous total",

          currentTotal:
            "New total",

          dismiss:
            "Dismiss notification",
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
      ).format(BigInt(value));
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
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      },
    ).format(date);
  };

  const dismissPriceChangeNotice =
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

  const showPriceChangeNotice =
    useCallback(
      (
        notice:
          PriceChangeNotice,
      ) => {
        if (
          noticeTimerRef.current
        ) {
          clearTimeout(
            noticeTimerRef.current,
          );
        }

        setPriceChangeNotice(
          notice,
        );

        noticeTimerRef.current =
          setTimeout(() => {
            noticeTimerRef.current =
              null;

            setPriceChangeNotice(
              null,
            );
          }, 8_000);
      },
      [],
    );

  const loadQuote =
    useCallback(
      async (
        items: CartItem[],
        options: QuoteLoadOptions =
          {},
      ) => {
        const requestId =
          requestIdRef.current +
          1;

        requestIdRef.current =
          requestId;

        requestControllerRef.current?.abort();

        if (items.length === 0) {
          quoteRef.current =
            null;

          setQuote(null);
          setError(null);
          setLoading(false);
          dismissPriceChangeNotice();

          return;
        }

        const controller =
          new AbortController();

        requestControllerRef.current =
          controller;

        if (!options.background) {
          setLoading(true);
        }

        setError(null);

        try {
          const response =
            await fetch(
              "/api/cart/quote",
              {
                method: "POST",

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
              "message" in data &&
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

          const previousQuote =
            quoteRef.current;

          if (
            options.notifyOnPriceChange &&
            previousQuote
          ) {
            const priceChange =
              detectPriceChange(
                previousQuote,
                data,
              );

            if (priceChange) {
              showPriceChangeNotice(
                priceChange,
              );
            }
          }

          quoteRef.current =
            data;

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
        dismissPriceChangeNotice,
        showPriceChangeNotice,
        text.genericError,
      ],
    );

  const scheduleQuote =
    useCallback(
      (
        items: CartItem[],
        immediate = false,
        options: QuoteLoadOptions =
          {},
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

        const delay =
          immediate ? 0 : 100;

        quoteTimerRef.current =
          setTimeout(() => {
            quoteTimerRef.current =
              null;

            void loadQuote(
              items,
              options,
            );
          }, delay);
      },
      [loadQuote],
    );

  useEffect(() => {
    scheduleQuote(
      storedItems,
      true,
    );
  }, [
    scheduleQuote,
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

        setLivePriceState(
          detail.status,
        );

        setLivePriceMessage(
          detail.message ?? null,
        );

        if (
          detail.status ===
          "success"
        ) {
          scheduleQuote(
            storedItems,
            true,
            {
              background: true,
              notifyOnPriceChange:
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
    scheduleQuote,
    storedItems,
  ]);

  useEffect(() => {
    return () => {
      if (
        quoteTimerRef.current
      ) {
        clearTimeout(
          quoteTimerRef.current,
        );
      }

      if (
        noticeTimerRef.current
      ) {
        clearTimeout(
          noticeTimerRef.current,
        );
      }

      requestControllerRef.current?.abort();
    };
  }, []);

  const updateQuoteOptimistically =
    useCallback(
      ({
        slug,
        variantId,
        quantity,
      }: {
        slug: string;
        variantId:
          string | null;
        quantity: number;
      }) => {
        setQuote(
          (current) => {
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
                    (item) =>
                      !isSameItem(
                        item,
                        target,
                      ),
                  )
                : current.items.map(
                    (item) => {
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
                        // قیمت سرور تا دریافت پاسخ جدید حفظ می‌شود.
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
                    (item) =>
                      !isSameItem(
                        item,
                        target,
                      ),
                  )
                : current.failedItems.map(
                    (item) =>
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

            const nextQuote = {
              ...current,
              items: nextItems,
              failedItems:
                nextFailedItems,

              summary:
                calculateSummary(
                  nextItems,
                  nextFailedItems,
                ),
            };

            quoteRef.current =
              nextQuote;

            return nextQuote;
          },
        );
      },
      [],
    );

  const changeQuantity = (
    item: QuotedCartItem,
    requestedQuantity: number,
  ) => {
    const availableStock =
      item.variant?.stock ??
      item.product.stock;

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
      slug: item.slug,
      variantId:
        item.variantId,
      quantity:
        safeQuantity,
    });

    updateCartItemQuantity({
      slug: item.slug,
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
    variantId: string | null;
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
    reason: string | null,
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
    storedItems.length === 0;

  /*
   * بررسی‌های دوره‌ای در پس‌زمینه بدون پیام انجام می‌شوند.
   * فقط خطا یا تغییر واقعی قیمت به مشتری نمایش داده می‌شود.
   */
  const shouldShowLiveStatus =
    livePriceState ===
    "failed";

  const checkoutBlocked =
    !quote?.summary
      .canCheckout ||
    loading ||
    Boolean(error) ||
    livePriceState === "failed";

  const priceNoticeDescription =
    priceChangeNotice?.direction ===
    "INCREASED"
      ? text.priceIncreased
      : priceChangeNotice?.direction ===
          "DECREASED"
        ? text.priceDecreased
        : text.priceChanged;

  return {
    isPersian,
    storedItems,
    quote,
    loading,
    error,
    livePriceMessage,
    priceChangeNotice,
    text,
    formatNumber,
    formatPrice,
    formatTime,
    dismissPriceChangeNotice,
    scheduleQuote,
    changeQuantity,
    removeItem,
    getUnavailableText,
    isEmpty,
    shouldShowLiveStatus,
    checkoutBlocked,
    priceNoticeDescription,
  };
}

export type CartPageController = ReturnType<typeof useCartPageController>;
