"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
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

/*
 * وضعیت نرخ بازار با فاصله زمانی کنترل‌شده بررسی می‌شود.
 * Quote صفحه قیمت و موجودی را مستقل و دقیق بررسی می‌کند.
 */
const VISIBLE_REFRESH_INTERVAL_MS =
  120_000;

const INITIAL_REFRESH_DELAY_MS =
  45_000;

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
   * فیلدهای قدیمی برای سازگاری با نسخه قبلی API
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

  return new Date().toISOString();
}

function getStringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
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
  if (material === "GOLD") {
    return "طلا";
  }

  if (material === "SILVER") {
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
    ).map(translateMaterial);

  if (materials.length === 0) {
    return "نرخ معتبر بازار در دسترس نیست. خرید تا دریافت نرخ معتبر موقتاً متوقف شده است.";
  }

  return `نرخ ${materials.join(
    " و ",
  )} قابل استفاده نیست. خرید تا دریافت نرخ معتبر موقتاً متوقف شده است.`;
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

  const mountedRef =
    useRef(true);

  const refreshLatestPrices =
    useCallback(async () => {
      if (refreshingRef.current) {
        return;
      }

      const cartItems =
        readCartItems();

      if (cartItems.length === 0) {
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
        status: "refreshing",
      });

      try {
        const response =
          await fetch(
            "/api/cart/refresh-prices",
            {
              method: "POST",

              cache: "no-store",

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
            .catch(() => null);

        if (!isRecord(rawData)) {
          dispatchLivePriceStatus({
            status: "failed",

            message:
              "پاسخ سرور برای بررسی نرخ بازار معتبر نیست.",
          });

          return;
        }

        const data: ApiResponse =
          rawData;

        if (
          !response.ok ||
          data.successful !== true
        ) {
          dispatchLivePriceStatus({
            status: "failed",

            message:
              getResponseMessage(
                data,
                "بررسی نرخ بازار انجام نشد.",
              ),
          });

          return;
        }

        /*
         * زمان آخرین بررسی فقط بعد از پاسخ معتبر سرور ثبت می‌شود.
         */
        lastRefreshAtRef.current =
          Date.now();

        const hasUnavailableRates =
          data.hasUnavailableRates ===
            true ||
          data.hasStaleRates === true;

        if (hasUnavailableRates) {
          dispatchLivePriceStatus({
            status: "failed",

            message:
              getUnavailableRateMessage(
                data,
              ),
          });

          return;
        }

        const refreshedAt =
          getResponseTimestamp(data);

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

        /*
         * وضعیت بازار بسته فقط برای منطق داخلی نگهداری می‌شود
         * و هیچ پیام دائمی برای مشتری نمایش داده نمی‌شود.
         */
        dispatchLivePriceStatus({
          status: "success",

          refreshedAt,

          pricingMode,

          closedMarketMaterials,
        });

        /*
         * Quote صفحه خودش قیمت و موجودی را بررسی می‌کند.
         * اینجا فقط وضعیت نرخ بازار اعلام می‌شود تا یک Quote تکراری ساخته نشود.
         */
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          if (!mountedRef.current) {
            return;
          }

          dispatchLivePriceStatus({
            status: "failed",

            message:
              "زمان دریافت نرخ بازار بیش از حد طول کشید.",
          });

          return;
        }

        console.error(
          "[Eloria Cart] Unable to check current market rates.",
          error,
        );

        dispatchLivePriceStatus({
          status: "failed",

          message:
            "ارتباط با سرویس بررسی نرخ بازار برقرار نشد.",
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
    mountedRef.current =
      true;

    lastRefreshAtRef.current =
      Date.now();

    const initialTimer =
      window.setTimeout(
        () => {
          void refreshLatestPrices();
        },
        INITIAL_REFRESH_DELAY_MS,
      );

    const shouldRefreshNow =
      () => {
        const elapsed =
          Date.now() -
          lastRefreshAtRef.current;

        return (
          elapsed >=
          VISIBLE_REFRESH_INTERVAL_MS
        );
      };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState !==
          "visible"
        ) {
          return;
        }

        if (shouldRefreshNow()) {
          void refreshLatestPrices();
        }
      };

    const handleWindowFocus =
      () => {
        if (shouldRefreshNow()) {
          void refreshLatestPrices();
        }
      };

    const handleOnline =
      () => {
        void refreshLatestPrices();
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
        VISIBLE_REFRESH_INTERVAL_MS,
      );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    window.addEventListener(
      "online",
      handleOnline,
    );

    return () => {
      mountedRef.current =
        false;

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

      window.removeEventListener(
        "online",
        handleOnline,
      );

      controllerRef.current?.abort();
    };
  }, [
    refreshLatestPrices,
  ]);

  return null;
}