"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  CART_UPDATED_EVENT,
  readCartItems,
} from "@/lib/cart-storage";

export const CART_LIVE_PRICE_EVENT =
  "eloria-live-price-refresh";

export type CartLivePriceEventDetail = {
  status:
    | "refreshing"
    | "success"
    | "failed";

  refreshedAt?: string;
  message?: string;
};

const VISIBILITY_REFRESH_INTERVAL_MS =
  60_000;

const REQUEST_TIMEOUT_MS =
  20_000;

function dispatchLivePriceStatus(
  detail:
    CartLivePriceEventDetail,
) {
  window.dispatchEvent(
    new CustomEvent(
      CART_LIVE_PRICE_EVENT,
      {
        detail,
      },
    ),
  );
}

export function CartLivePriceRefresh() {
  const controllerRef =
    useRef<AbortController | null>(
      null,
    );

  const refreshingRef =
    useRef(false);

  const lastRefreshAtRef =
    useRef(0);

  const refreshLatestPrices =
    useCallback(async () => {
      if (
        refreshingRef.current
      ) {
        return;
      }

      const cartItems =
        readCartItems();

      if (
        cartItems.length === 0
      ) {
        return;
      }

      refreshingRef.current =
        true;

      controllerRef.current?.abort();

      const controller =
        new AbortController();

      controllerRef.current =
        controller;

      const timeoutId =
        window.setTimeout(
          () => {
            controller.abort();
          },
          REQUEST_TIMEOUT_MS,
        );

      dispatchLivePriceStatus({
        status:
          "refreshing",
      });

      try {
        const response =
          await fetch(
            "/api/cart/refresh-prices",
            {
              method:
                "POST",

              cache:
                "no-store",

              headers: {
                Accept:
                  "application/json",
              },

              signal:
                controller.signal,
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
          typeof data !==
            "object" ||
          data === null ||
          !(
            "successful" in
            data
          ) ||
          data.successful !==
            true
        ) {
          let message =
            "به‌روزرسانی نرخ زنده انجام نشد.";

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

          dispatchLivePriceStatus({
            status:
              "failed",

            message,
          });

          return;
        }

        const refreshedAt =
          "refreshedAt" in
              data &&
          typeof data.refreshedAt ===
            "string"
            ? data.refreshedAt
            : new Date().toISOString();

        lastRefreshAtRef.current =
          Date.now();

        dispatchLivePriceStatus({
          status:
            "success",

          refreshedAt,
        });

        window.dispatchEvent(
          new CustomEvent(
            CART_UPDATED_EVENT,
            {
              detail: {
                reason:
                  "live-price-refresh",
              },
            },
          ),
        );
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          dispatchLivePriceStatus({
            status:
              "failed",

            message:
              "زمان دریافت نرخ زنده بیش از حد طول کشید.",
          });

          return;
        }

        console.error(
          "[Eloria Cart] Unable to refresh live prices.",
          error,
        );

        dispatchLivePriceStatus({
          status:
            "failed",

          message:
            "اتصال به سرویس نرخ زنده برقرار نشد.",
        });
      } finally {
        window.clearTimeout(
          timeoutId,
        );

        refreshingRef.current =
          false;

        if (
          controllerRef.current ===
          controller
        ) {
          controllerRef.current =
            null;
        }
      }
    }, []);

  useEffect(() => {
    const initialTimer =
      window.setTimeout(
        () => {
          void refreshLatestPrices();
        },
        0,
      );

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState !==
          "visible"
        ) {
          return;
        }

        const elapsed =
          Date.now() -
          lastRefreshAtRef.current;

        if (
          elapsed >=
          VISIBILITY_REFRESH_INTERVAL_MS
        ) {
          void refreshLatestPrices();
        }
      };

    const handleWindowFocus =
      () => {
        const elapsed =
          Date.now() -
          lastRefreshAtRef.current;

        if (
          elapsed >=
          VISIBILITY_REFRESH_INTERVAL_MS
        ) {
          void refreshLatestPrices();
        }
      };

    const intervalId =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void refreshLatestPrices();
          }
        },
        VISIBILITY_REFRESH_INTERVAL_MS,
      );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    return () => {
      window.clearTimeout(
        initialTimer,
      );

      window.clearInterval(
        intervalId,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );

      controllerRef.current?.abort();
    };
  }, [
    refreshLatestPrices,
  ]);

  return null;
}