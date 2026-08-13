"use client";

import {
  Heart,
  Trash2,
} from "lucide-react";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  readTreasury,
  removeFromTreasury,
  subscribeToTreasury,
  TREASURY_STORAGE_KEY,
  type TreasuryStoredItem,
} from "@/lib/treasury-storage";

type TreasuryProduct = {
  slug: string;
  name: string;
  imageUrl: string;
};

type TreasuryResponse = {
  items?: unknown;
};

type TreasuryPanelProps = {
  locale: string;
  isPersian: boolean;
  emptyTitle: string;
  emptyDescription: string;
  collectionsLabel: string;
};

function isProduct(
  value: unknown,
): value is TreasuryProduct {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<TreasuryProduct>;

  return (
    typeof candidate.slug ===
      "string" &&
    typeof candidate.name ===
      "string" &&
    typeof candidate.imageUrl ===
      "string"
  );
}

function getTreasurySnapshot() {
  if (
    typeof window === "undefined"
  ) {
    return "[]";
  }

  return (
    window.localStorage.getItem(
      TREASURY_STORAGE_KEY,
    ) ?? "[]"
  );
}

function getTreasuryServerSnapshot() {
  return "[]";
}

export function TreasuryPanel({
  locale,
  isPersian,
  emptyTitle,
  emptyDescription,
  collectionsLabel,
}: TreasuryPanelProps) {
  const snapshot =
    useSyncExternalStore(
      subscribeToTreasury,
      getTreasurySnapshot,
      getTreasuryServerSnapshot,
    );

  const storedItems =
    useMemo<
      TreasuryStoredItem[]
    >(() => {
      void snapshot;
      return readTreasury();
    }, [snapshot]);

  const slugs =
    useMemo(
      () =>
        storedItems.map(
          (item) =>
            item.slug,
        ),
      [storedItems],
    );

  const requestKey =
    useMemo(
      () =>
        JSON.stringify({
          locale,
          slugs,
        }),
      [locale, slugs],
    );

  const [
    products,
    setProducts,
  ] = useState<
    TreasuryProduct[]
  >([]);

  const [
    resolvedKey,
    setResolvedKey,
  ] = useState("");

  const loading =
    slugs.length > 0 &&
    resolvedKey !==
      requestKey;

  useEffect(() => {
    if (
      slugs.length === 0
    ) {
      return;
    }

    const controller =
      new AbortController();

    void fetch(
      "/api/treasury/products",
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
            slugs,
            locale,
          }),
      },
    )
      .then(
        async (
          response,
        ) => {
          if (
            !response.ok
          ) {
            return null;
          }

          return (await response
            .json()
            .catch(
              () => null,
            )) as TreasuryResponse | null;
        },
      )
      .then(
        (data) => {
          if (
            controller
              .signal
              .aborted
          ) {
            return;
          }

          if (
            !data ||
            !Array.isArray(
              data.items,
            )
          ) {
            setProducts([]);
            return;
          }

          setProducts(
            data.items.filter(
              isProduct,
            ),
          );
        },
      )
      .catch(
        (error) => {
          if (
            controller
              .signal
              .aborted
          ) {
            return;
          }

          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          setProducts([]);
        },
      )
      .finally(() => {
        if (
          !controller
            .signal
            .aborted
        ) {
          setResolvedKey(
            requestKey,
          );
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    locale,
    requestKey,
    slugs,
  ]);

  const productMap =
    useMemo(
      () =>
        new Map(
          products.map(
            (product) => [
              product.slug,
              product,
            ],
          ),
        ),
      [products],
    );

  if (
    storedItems.length === 0
  ) {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-[#d8b967]/10 bg-[linear-gradient(150deg,rgba(7,34,25,.50),rgba(3,18,13,.42))] px-5 py-10 text-center sm:px-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[19px] border border-[#d8b967]/14 bg-[#0a2a1f]/56 text-[#ddc47e]/72">
          <Heart
            className="h-6 w-6"
            strokeWidth={
              1.5
            }
          />
        </div>

        <h3
          className={
            isPersian
              ? "font-persian-title mt-5 text-[17px] text-[#eee2c7]/92"
              : "mt-5 text-base font-semibold text-[#eee2c7]/92"
          }
        >
          {emptyTitle}
        </h3>

        <p
          className={
            isPersian
              ? "font-sans mx-auto mt-3 max-w-md text-[12px] leading-7 tracking-normal text-[#c8b996]/58 sm:text-[13px]"
              : "mx-auto mt-3 max-w-md text-xs leading-6 text-[#c8b996]/58 sm:text-[13px]"
          }
        >
          {
            emptyDescription
          }
        </p>

        <Link
          href={`/${locale}/collections`}
          className={
            isPersian
              ? "font-sans mt-6 inline-flex items-center rounded-full border border-[#d9bc6d]/20 bg-[#0b3023]/62 px-5 py-2.5 text-[12px] font-medium tracking-normal text-[#ead18a] transition hover:border-[#e5c874]/35 hover:bg-[#0d3929]"
              : "mt-6 inline-flex items-center rounded-full border border-[#d9bc6d]/20 bg-[#0b3023]/62 px-5 py-2.5 text-xs font-medium text-[#ead18a] transition hover:border-[#e5c874]/35 hover:bg-[#0d3929]"
          }
        >
          {
            collectionsLabel
          }
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <p
          className={
            isPersian
              ? "font-sans text-[11px] leading-6 tracking-normal text-[#c6b895]/50"
              : "text-[11px] leading-6 text-[#c6b895]/50"
          }
        >
          {loading
            ? isPersian
              ? "\u062f\u0631 \u062d\u0627\u0644 \u0628\u0647\u200c\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0645\u0646\u062a\u062e\u0628\u200c\u0647\u0627\u06cc \u0634\u0645\u0627..."
              : "Refreshing favorites..."
            : isPersian
              ? `${storedItems.length.toLocaleString("fa-IR")} \u0627\u062b\u0631 \u0645\u0646\u062a\u062e\u0628`
              : `${storedItems.length.toLocaleString("en-US")} saved piece${storedItems.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {storedItems.map(
          (stored) => {
            const product =
              productMap.get(
                stored.slug,
              );

            const title =
              product?.name ||
              stored.slug;

            return (
              <article
                key={
                  stored.slug
                }
                className="group overflow-hidden rounded-[24px] border border-[#d8b967]/10 bg-[linear-gradient(150deg,rgba(7,34,25,.58),rgba(3,18,13,.52))] shadow-[0_16px_50px_rgba(0,0,0,.14)]"
              >
                <Link
                  href={`/${locale}/products/${encodeURIComponent(stored.slug)}`}
                  className="block"
                >
                  <div
                    className="aspect-[4/3] w-full bg-[#082219] bg-cover bg-center transition duration-500 group-hover:scale-[1.015] motion-reduce:transform-none"
                    style={
                      product?.imageUrl
                        ? {
                            backgroundImage:
                              `linear-gradient(rgba(3,18,13,.04),rgba(3,18,13,.22)),url("${product.imageUrl.replaceAll('"', "%22")}")`,
                          }
                        : undefined
                    }
                  />

                  <div className="p-4">
                    <p
                      className={
                        isPersian
                          ? "font-persian-title line-clamp-2 text-[15px] leading-7 text-[#eee1c2]/88"
                          : "line-clamp-2 text-sm font-semibold leading-6 text-[#eee1c2]/88"
                      }
                    >
                      {title}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center justify-between gap-3 border-t border-[#d8b967]/[0.07] px-4 py-3">
                  <Link
                    href={`/${locale}/products/${encodeURIComponent(stored.slug)}`}
                    className={
                      isPersian
                        ? "font-sans text-[11px] font-medium tracking-normal text-[#d8be76]/64 transition hover:text-[#ead18b]"
                        : "text-[11px] font-medium text-[#d8be76]/64 transition hover:text-[#ead18b]"
                    }
                  >
                    {isPersian
                      ? "\u0645\u0634\u0627\u0647\u062f\u0647 \u0627\u062b\u0631"
                      : "View piece"}
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      removeFromTreasury(
                        stored.slug,
                      );
                    }}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-white/32 transition hover:border-[#d9b85f]/18 hover:text-[#dfc16f]"
                    aria-label={
                      isPersian
                        ? "\u062d\u0630\u0641 \u0627\u0632 \u0645\u0646\u062a\u062e\u0628\u200c\u0647\u0627"
                        : "Remove from favorites"
                    }
                  >
                    <Trash2
                      className="h-4 w-4"
                      strokeWidth={
                        1.5
                      }
                    />
                  </button>
                </div>
              </article>
            );
          },
        )}
      </div>
    </div>
  );
}
