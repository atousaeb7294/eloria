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

export type CartLivePriceMode =
  | "LIVE"
  | "CLOSED_MARKET";

export type CartLivePriceEventDetail = {
  status:
    | "refreshing"
    | "success"
    | "failed";

  refreshedAt?: string;

  message?: string;

  pricingMode?: CartLivePriceMode;

  closedMarketMaterials?: string[];
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

  hasUnavailableRates?: unknown;

  unavailableMaterials?: unknown;

  hasClosedMarketRates?: unknown;

  closedMarketMaterials?: unknown;

  /*
   * فیلدهای موقت برای سازگاری با نسخه قبلی API
   */
  hasStaleRates?: unknown;

  staleMaterials?: unknown;
};

function dispatchLivePriceStatus(
  detail: CartLivePriceEventDetail,
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

function getStringArray(
  value: unknown,
): string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is string =>
      typeof item ===
      "string",
  );
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

function getUnavailableRateMessage(
  data: ApiResponse,
): string {
  const unavailableMaterials =
    getStringArray(
      data.unavailableMaterials,
    );

  const legacyStaleMaterials =
    getStringArray(
      data.staleMaterials,
    );

  const materials =
    (
      unavailableMaterials.length >
      0
        ? unavailableMaterials
        : legacyStaleMaterials
    ).map(
      translateMaterial,
    );

  if (
    materials.length ===
    0
  ) {
    return "نرخ بازار قابل استفاده نیست. خرید تا دریافت نرخ معتبر موقتاً متوقف است.";
  }

  return `نرخ ${materials.join(
    " و ",
  )} قابل استفاده نیست. خرید تا دریافت نرخ معتبر موقتاً متوقف است.`;
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

        const data: ApiResponse =
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
                "بررسی نرخ بازار انجام نشد.",
              ),
          });

          return;
        }

        /*
         * زمان بررسی محلی فقط پس از دریافت پاسخ معتبر ثبت می‌شود.
         */
        lastRefreshAtRef.current =
          Date.now();

        /*
         * نرخ بازار بسته قابل فروش است و نباید در این بخش
         * به‌عنوان خطا گزارش شود.
         */
        const hasUnavailableRates =
          data.hasUnavailableRates ===
            true ||
          data.hasStaleRates ===
            true;

        if (
          hasUnavailableRates
        ) {
          dispatchLivePriceStatus({
            status:
              "failed",

            message:
              getUnavailableRateMessage(
                data,
              ),
          });

          return;
        }

        const refreshedAt =
          getResponseTimestamp(
            data,
          );

        const closedMarketMaterials =
          getStringArray(
            data.closedMarketMaterials,
          );

        const pricingMode:
          CartLivePriceMode =
          data.hasClosedMarketRates ===
            true ||
          closedMarketMaterials.length >
            0
            ? "CLOSED_MARKET"
            : "LIVE";

        dispatchLivePriceStatus({
          status:
            "success",

          refreshedAt,

          pricingMode,

          closedMarketMaterials,
        });

        /*
         * پس از تأیید قابل‌فروش‌بودن نرخ‌ها،
         * قیمت سبد دوباره از سرور دریافت می‌شود.
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