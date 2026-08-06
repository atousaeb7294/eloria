"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, LoaderCircle, Minus, Plus, RefreshCw, ShoppingBag, Trash2, X } from "lucide-react";
import { PurchaseProgress } from "@/components/purchase-progress";
import type { CartPageClientProps } from "@/components/cart/cart-page-model";
import type { CartPageController } from "@/components/cart/use-cart-page-controller";

export function CartPageView({
  locale,
  persianTitleClassName,
  controller,
}: CartPageClientProps & { controller: CartPageController }) {
  const {
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
  } = controller;

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
    <section className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-44 pt-36 sm:px-6 lg:px-10 lg:pb-28 lg:pt-40">
      {priceChangeNotice && (
        <div
          role="status"
          aria-live="polite"
          className={[
            "fixed top-24 z-[100] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-[#d9b85f]/35 bg-[linear-gradient(145deg,rgba(8,42,31,0.98),rgba(2,23,16,0.99))] p-4 shadow-[0_25px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:w-full",
            isPersian
              ? "right-4 sm:right-6"
              : "right-4 sm:right-6",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <div
              className={[
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                priceChangeNotice.direction ===
                "INCREASED"
                  ? "border-amber-300/25 bg-amber-200/[0.08] text-amber-200"
                  : priceChangeNotice.direction ===
                      "DECREASED"
                    ? "border-emerald-300/25 bg-emerald-200/[0.08] text-emerald-200"
                    : "border-[#d9b85f]/30 bg-[#d9b85f]/[0.08] text-[#ead27e]",
              ].join(" ")}
            >
              {priceChangeNotice.direction ===
              "INCREASED" ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : priceChangeNotice.direction ===
                "DECREASED" ? (
                <ArrowDownRight className="h-5 w-5" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#f4e5bd]">
                {
                  text.priceUpdated
                }
              </p>

              <p className="mt-1 text-xs leading-6 text-[#d2c4a4]/65">
                {
                  priceNoticeDescription
                }
              </p>

              <p className="mt-1 text-[10px] text-[#d6c9aa]/45">
                {formatNumber(
                  priceChangeNotice
                    .changedItemsCount,
                )}{" "}
                {
                  text.changedItems
                }
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2">
                  <p className="text-[9px] text-[#c9bb9a]/45">
                    {
                      text.previousTotal
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
                      text.currentTotal
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
                dismissPriceChangeNotice
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

        <PurchaseProgress
          locale={locale}
          currentStep={1}
        />

        {shouldShowLiveStatus && (
          <div className="mt-5 flex justify-center">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-300/20 bg-amber-200/[0.05] px-4 py-2 text-[10px] leading-5 text-amber-100/60">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />

              <span>
                {livePriceMessage ??
                  text.liveFailed}
              </span>
            </div>
          </div>
        )}
      </header>

      {error && (
        <div className="mx-auto mt-10 flex max-w-3xl items-start gap-4 rounded-2xl border border-red-300/20 bg-red-300/[0.06] px-5 py-4 text-sm text-red-100/80">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="flex-1">
            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                scheduleQuote(
                  storedItems,
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
                  <div
                    key={`${item.slug}:${item.variantId ?? "default"}`}
                    className="rounded-[2rem]"
                  >
                    <article
                      className={[
                        "relative overflow-hidden rounded-[2rem] border bg-[linear-gradient(145deg,rgba(7,35,27,0.92),rgba(3,21,15,0.96))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] transition-shadow duration-300 sm:p-5",
                        item.canPurchase
                          ? "border-[#d8b860]/22 hover:shadow-[0_34px_100px_rgba(0,0,0,0.34)]"
                          : "border-amber-300/25",
                      ].join(" ")}
                    >
                    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5">
                      <div className="relative aspect-square overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-[#041b14]">
                        {item.image ? (
                          <Image
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
                            fill
                            unoptimized={
                              /^https?:\/\//.test(
                                item.image.url,
                              )
                            }
                            sizes="(min-width: 640px) 150px, 96px"
                            className="object-cover"
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
                              className="text-base font-medium leading-7 text-[#f3e3be] transition hover:text-[#f7d981] sm:text-lg"
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

                        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[0.07] pt-4 sm:mt-5 sm:grid-cols-3 sm:pt-5">
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

                          <div className="col-span-2 sm:col-span-1">
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
                </div>
                );
              },
            )}

            {quote.failedItems.map(
              (item) => (
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
            <div className="rounded-[2rem]">
              <div className="relative rounded-[2rem] border border-[#d9b85f]/25 bg-[linear-gradient(150deg,rgba(9,39,29,0.97),rgba(3,21,15,0.99))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
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
                  checkoutBlocked
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

              {checkoutBlocked && (
                <p className="mt-3 text-center text-[10px] leading-5 text-amber-100/45">
                  {
                    text.checkoutBlocked
                  }
                </p>
              )}
              </div>
            </div>
          </aside>

            <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-[#d9b85f]/22 bg-[linear-gradient(180deg,rgba(3,25,18,0.96),rgba(2,18,13,0.99))] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.42)] backdrop-blur-2xl lg:hidden">
              <div className="mx-auto flex max-w-xl items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-[#c9bb9a]/55">
                    {text.subtotal}
                  </p>

                  <p className="mt-0.5 truncate text-base font-semibold text-[#f0d477]">
                    {formatPrice(
                      quote.summary
                        .subtotalToman,
                    )}{" "}
                    <span className="text-[10px] font-normal text-[#c9bb9a]/55">
                      {text.toman}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    checkoutBlocked
                  }
                  onClick={() => {
                    window.location.assign(
                      `/${locale}/checkout`,
                    );
                  }}
                  className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-[#e0c16d]/55 bg-[linear-gradient(100deg,rgba(112,80,20,0.22),rgba(218,183,90,0.3),rgba(112,80,20,0.22))] px-5 text-xs font-medium text-[#f6e4af] transition disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {loading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}

                  <span>
                    {isPersian
                      ? "ادامه خرید"
                      : "Checkout"}
                  </span>
                </button>
              </div>
            </div>
        </div>
      )}
    </section>
  );

}
