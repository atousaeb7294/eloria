"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, LoaderCircle, RefreshCw, ShieldCheck, ShoppingBag, UserRound, WalletCards, X } from "lucide-react";
import { PurchaseProgress } from "@/components/purchase-progress";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { getItemKey, type CheckoutPageClientProps } from "@/components/checkout/checkout-page-model";
import type { CheckoutPageController } from "@/components/checkout/use-checkout-page-controller";

export function CheckoutPageView({
  locale,
  persianTitleClassName,
  controller,
}: CheckoutPageClientProps & { controller: CheckoutPageController }) {
  const {
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
  } = controller;

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
    <section className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-44 pt-36 sm:px-6 lg:px-10 lg:pb-28 lg:pt-40">
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

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-8 text-[#cbbd9d]/65">
          {text.description}
        </p>

        <PurchaseProgress
          locale={locale}
          currentStep={
            createdOrder ? 3 : 2
          }
        />
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
                <div className="rounded-[2rem]">
                  <section className="relative rounded-[2rem] border border-[#d9b85f]/20 bg-[linear-gradient(145deg,rgba(7,35,27,0.94),rgba(3,21,15,0.97))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-7">
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
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#e5c873]/60 focus:bg-[#d9b85f]/[0.035] focus:shadow-[0_0_0_3px_rgba(217,184,95,0.06)]"
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
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-left text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#e5c873]/60 focus:bg-[#d9b85f]/[0.035] focus:shadow-[0_0_0_3px_rgba(217,184,95,0.06)]"
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
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-left text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#e5c873]/60 focus:bg-[#d9b85f]/[0.035] focus:shadow-[0_0_0_3px_rgba(217,184,95,0.06)]"
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
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#e5c873]/60 focus:bg-[#d9b85f]/[0.035] focus:shadow-[0_0_0_3px_rgba(217,184,95,0.06)]"
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
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#e5c873]/60 focus:bg-[#d9b85f]/[0.035] focus:shadow-[0_0_0_3px_rgba(217,184,95,0.06)]"
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
                        className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-black/10 px-4 text-left text-sm text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#e5c873]/60 focus:bg-[#d9b85f]/[0.035] focus:shadow-[0_0_0_3px_rgba(217,184,95,0.06)]"
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
                        className="w-full resize-y rounded-xl border border-white/[0.09] bg-black/10 px-4 py-3 text-sm leading-7 text-[#f3e6c9] outline-none transition placeholder:text-[#c8b996]/25 focus:border-[#e5c873]/60 focus:bg-[#d9b85f]/[0.035] focus:shadow-[0_0_0_3px_rgba(217,184,95,0.06)]"
                      />
                    </label>
                  </div>
                  </section>
                </div>

                <div className="rounded-[2rem]">
                  <section className="relative rounded-[2rem] border border-[#d9b85f]/20 bg-[linear-gradient(145deg,rgba(7,35,27,0.94),rgba(3,21,15,0.97))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-7">
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
                            className="group flex items-start justify-between gap-5 rounded-xl px-2 py-4 transition duration-300 first:pt-0 last:pb-0 hover:bg-[#d9b85f]/[0.035]"
                          >
                            <div className="min-w-0">
                              <Link
                                href={`/${locale}/products/${item.slug}`}
                                className="text-sm text-[#eee0bd] transition group-hover:text-[#f2d678] hover:text-[#f2d678]"
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
              </div>

              <aside className="lg:sticky lg:top-28">
                <div className="rounded-[2rem]">
                  <div className="relative rounded-[2rem] border border-[#d9b85f]/25 bg-[linear-gradient(150deg,rgba(9,39,29,0.98),rgba(3,21,15,0.995))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.34)]">
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
                        {createdOrder.paymentMessage || text.gatewayPending}
                      </p>

                      {createdOrder.paymentUrl ? (
                        <a
                          href={createdOrder.paymentUrl}
                          className="mt-6 flex min-h-13 w-full items-center justify-center gap-3 rounded-full border border-[#e0c16d]/45 bg-[#d9b85f]/[0.11] px-6 text-sm text-[#f6e4af]"
                        >
                          <WalletCards className="h-4 w-4" />
                          {locale === "fa" ? "ورود به درگاه پرداخت" : "Continue to payment"}
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="mt-6 flex min-h-13 w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-[#e0c16d]/25 bg-[#d9b85f]/[0.05] px-6 text-sm text-[#f6e4af]/40"
                        >
                          <WalletCards className="h-4 w-4" />
                          {text.gatewayButton}
                        </button>
                      )}
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

                      <TurnstileWidget
                        locale={locale}
                        onTokenChange={setTurnstileToken}
                      />

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
                        className="mt-6 hidden min-h-13 w-full items-center justify-center gap-3 rounded-full border border-[#e0c16d]/55 bg-[linear-gradient(100deg,rgba(112,80,20,0.22),rgba(218,183,90,0.3),rgba(112,80,20,0.22))] px-6 text-sm font-medium text-[#f6e4af] transition hover:-translate-y-0.5 hover:border-[#f0d681]/85 hover:shadow-[0_0_30px_rgba(218,183,91,0.14)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 lg:flex"
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
                        className="mt-4 hidden min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/[0.08] text-xs text-[#cfc19e]/60 transition hover:border-[#d9b85f]/25 hover:text-[#efd98e] lg:flex"
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
                </div>
              </aside>

              {!createdOrder && (
                <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-[#d9b85f]/22 bg-[linear-gradient(180deg,rgba(3,25,18,0.96),rgba(2,18,13,0.99))] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.42)] backdrop-blur-2xl lg:hidden">
                  <div className="mx-auto flex max-w-xl items-center gap-3">
                    <Link
                      href={`/${locale}/cart`}
                      aria-label={text.cart}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.1] text-[#d5c69f]/70 transition hover:border-[#d9b85f]/30 hover:text-[#efd98e]"
                    >
                      {isPersian ? (
                        <ArrowRight className="h-4 w-4" />
                      ) : (
                        <ArrowLeft className="h-4 w-4" />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-[#c9bb9a]/55">
                        {text.payable}
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
                      type="submit"
                      disabled={
                        checkoutBlocked
                      }
                      className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-[#e0c16d]/55 bg-[linear-gradient(100deg,rgba(112,80,20,0.22),rgba(218,183,90,0.3),rgba(112,80,20,0.22))] px-5 text-xs font-medium text-[#f6e4af] transition disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {submitting ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <WalletCards className="h-4 w-4" />
                      )}

                      <span>
                        {submitting
                          ? isPersian
                            ? "در حال ثبت..."
                            : "Creating..."
                          : isPersian
                            ? "ثبت سفارش"
                            : "Create order"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          )
        )}
    </section>
  );

}
