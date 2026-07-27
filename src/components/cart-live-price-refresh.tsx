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

type ApiResponse = {
  successful?: unknown;
  refreshedAt?: unknown;
  checkedAt?: unknown;
  message?: unknown;
  hasStaleRates?: unknown;
  staleMaterials?: unknown;
};

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

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null
  );
}

function getResponseMessage(
  data: ApiResponse,
  fallback: string,
): string {
  return typeof data.message ===
    "string"
    ? data.message
    : fallback;
}

function getResponseTimestamp(
  data: ApiResponse,
): string {
  if (
    typeof data.checkedAt ===
    "string"
  ) {
    return data.checkedAt;
  }

  if (
    typeof data.refreshedAt ===
    "string"
  ) {
    return data.refreshedAt;
  }

  return new Date()
    .toISOString();
}

function translateMaterial(
  material: string,
): string {
  if (
    material ===
    "GOLD"
  ) {
    return "طلا";
  }

  if (
    material ===
    "SILVER"
  ) {
    return "نقره";
  }

  return material;
}

function getStaleRateMessage(
  data: ApiResponse,
): string {
  if (
    !Array.isArray(
      data.staleMaterials,
    )
  ) {
    return "نرخ بازار منقضی شده است. خرید تا دریافت نرخ جدید موقتاً متوقف است.";
  }

  const materials =
    data.staleMaterials
      .filter(
        (
          material,
        ): material is string =>
          typeof material ===
          "string",
      )
      .map(
        translateMaterial,
      );

  if (
    materials.length ===
    0
  ) {
    return "نرخ بازار منقضی شده است. خرید تا دریافت نرخ جدید موقتاً متوقف است.";
  }

  return `نرخ ${materials.join(
    " و ",
  )} منقضی شده است. خرید تا دریافت نرخ جدید موقتاً متوقف است.`;
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
        cartItems.length ===
        0
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

        const rawData: unknown =
          await response
            .json()
            .catch(
              () => null,
            );

        if (
          !isRecord(
            rawData,
          )
        ) {
          dispatchLivePriceStatus({
            status:
              "failed",

            message:
              "پاسخ بررسی نرخ بازار معتبر نیست.",
          });

          return;
        }

        const data:
          ApiResponse =
          rawData;

        if (
          !response.ok ||
          data.successful !==
            true
        ) {
          dispatchLivePriceStatus({
            status:
              "failed",

            message:
              getResponseMessage(
                data,
                "بررسی نرخ زنده انجام نشد.",
              ),
          });

          return;
        }

        /*
         * درخواست با موفقیت بررسی شده است؛
         * پس زمان آخرین بررسی محلی ثبت می‌شود،
         * حتی اگر نرخ بازار منقضی باشد.
         */
        lastRefreshAtRef.current =
          Date.now();

        /*
         * پاسخ موفق HTTP الزاماً به معنی
         * معتبر بودن نرخ بازار نیست.
         */
        if (
          data.hasStaleRates ===
          true
        ) {
          dispatchLivePriceStatus({
            status:
              "failed",

            message:
              getStaleRateMessage(
                data,
              ),
          });

          return;
        }

        const refreshedAt =
          getResponseTimestamp(
            data,
          );

        dispatchLivePriceStatus({
          status:
            "success",

          refreshedAt,
        });

        /*
         * فقط وقتی نرخ‌ها معتبرند،
         * محاسبه قیمت سبد دوباره انجام می‌شود.
         */
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
              "زمان دریافت وضعیت نرخ بازار بیش از حد طول کشید.",
          });

          return;
        }

        console.error(
          "[Eloria Cart] Unable to check stored live prices.",
          error,
        );

        dispatchLivePriceStatus({
          status:
            "failed",

          message:
            "اتصال به سرویس بررسی نرخ بازار برقرار نشد.",
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