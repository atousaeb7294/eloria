"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CART_LIVE_PRICE_EVENT, type CartLivePriceEventDetail } from "@/components/cart-live-price-refresh";
import { CheckoutCustomerError, normalizeCheckoutCustomer, type CheckoutCustomerInput } from "@/lib/checkout-customer";
import { subscribeToCart, type CartItem } from "@/lib/cart-storage";
import { didQuotePriceChange, getCartSnapshot, getErrorMessage, getCartFingerprint, getOrCreateIdempotencyKey, getServerCartSnapshot, isCartQuoteResponse, isCreateOrderResponse, parseCartSnapshot, FA_TEXT, EN_TEXT, type CartQuoteResponse, type CheckoutPageClientProps, type CreatedOrder, type CustomerForm, type PriceChangeNotice } from "@/components/checkout/checkout-page-model";

export function useCheckoutPageController({
  locale,
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

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

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

                  turnstileToken,

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

        const createdOrderWithPayment: CreatedOrder = {
          ...data.order,
          paymentConfigured: data.payment.configured,
          paymentUrl: data.payment.redirectUrl,
          paymentMessage: data.payment.message,
        };

        setCreatedOrder(createdOrderWithPayment);
        setSubmitError(null);

        if (data.payment.redirectUrl) {
          window.location.assign(data.payment.redirectUrl);
          return;
        }
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

  return {
    isPersian,
    text,
    storedItems,
    quote,
    quoteLoading,
    quoteError,
    livePriceFailed,
    submitting,
    submitError,
    setTurnstileToken,
    createdOrder,
    priceChangeNotice,
    form,
    setForm,
    formatPrice,
    formatNumber,
    formatDateTime,
    dismissPriceNotice,
    loadQuote,
    handleSubmit,
    isEmpty,
    checkoutBlocked,
  };
}

export type CheckoutPageController = ReturnType<typeof useCheckoutPageController>;
