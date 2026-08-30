"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  LoaderCircle,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { readTreasury } from "@/lib/treasury-storage";

type LoginChannel = "EMAIL" | "SMS";

export function CustomerLoginClient({
  locale,
  nextPath,
}: {
  locale: "fa" | "en";
  nextPath?: string | null;
}) {
  const fa = locale === "fa";
  const router = useRouter();

  const [channel, setChannel] =
    useState<LoginChannel>("EMAIL");

  const [email, setEmail] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [code, setCode] =
    useState("");

  const [challengeId, setChallengeId] =
    useState<string | null>(null);

  const [turnstileToken, setTurnstileToken] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [devCode, setDevCode] =
    useState<string | null>(null);

  const onTokenChange =
    useCallback(
      (token: string | null) =>
        setTurnstileToken(token),
      [],
    );

  function changeChannel(
    nextChannel: LoginChannel,
  ) {
    if (nextChannel === "SMS") {
      setMessage(
        fa
          ? "ورود پیامکی پس از فعال‌سازی سرویس پیامک در دسترس قرار می‌گیرد."
          : "SMS login will be available after the SMS service is activated.",
      );
      return;
    }

    setChannel(nextChannel);
    setChallengeId(null);
    setCode("");
    setDevCode(null);
    setMessage(null);
  }

  async function requestCode(
    event: FormEvent,
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage(null);
    setDevCode(null);

    try {
      const response = await fetch(
        "/api/customer/auth/request-otp",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            channel,
            email:
              channel === "EMAIL"
                ? email
                : undefined,
            mobile,
            turnstileToken,
          }),
        },
      );

      const data =
        (await response
          .json()
          .catch(() => null)) as {
          successful?: boolean;
          challengeId?: string;
          message?: string;
          developmentCode?: string;
        } | null;

      if (
        !response.ok ||
        !data?.successful ||
        !data.challengeId
      ) {
        throw new Error(
          data?.message ||
            (fa
              ? "ارسال کد ورود ناموفق بود."
              : "Could not send the login code."),
        );
      }

      setChallengeId(
        data.challengeId,
      );

      setDevCode(
        data.developmentCode ??
          null,
      );

      setMessage(
        channel === "EMAIL"
          ? fa
            ? "کد ۶ رقمی ورود به ایمیل شما ارسال شد."
            : "A 6-digit login code was sent to your email."
          : fa
            ? "کد ورود به شماره موبایل شما ارسال شد."
            : "A login code was sent to your mobile.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : fa
            ? "ارسال کد ورود ناموفق بود."
            : "Could not send the login code.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!challengeId) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/customer/auth/verify-otp",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            challengeId,
            channel,
            email:
              channel === "EMAIL"
                ? email
                : undefined,
            mobile,
            code,
          }),
        },
      );

      const data =
        (await response
          .json()
          .catch(() => null)) as {
          successful?: boolean;
          message?: string;
        } | null;

      if (
        !response.ok ||
        !data?.successful
      ) {
        throw new Error(
          data?.message ||
            (fa
              ? "ورود ناموفق بود."
              : "Login failed."),
        );
      }

      const localFavorites =
        readTreasury().map(
          item => item.slug,
        );

      if (
        localFavorites.length
      ) {
        await fetch(
          "/api/customer/favorites",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              slugs:
                localFavorites,
            }),
          },
        ).catch(
          () => undefined,
        );
      }

      const safeNext =
        nextPath &&
        nextPath.startsWith(
          `/${locale}/`,
        )
          ? nextPath
          : `/${locale}/profile`;

      router.replace(safeNext);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : fa
            ? "ورود ناموفق بود."
            : "Login failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      dir={fa ? "rtl" : "ltr"}
      className="mx-auto max-w-xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40"
    >
      <div className="overflow-hidden rounded-[32px] border border-[#d8b967]/18 bg-[linear-gradient(155deg,rgba(7,40,29,.90),rgba(2,18,13,.94))] p-6 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-9">
        <div className="flex items-center gap-3 text-[#e5ca7c]">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs">
            {fa
              ? "ورود امن مشتری"
              : "Secure customer access"}
          </span>
        </div>

        <h1
          className={
            fa
              ? "font-persian-title mt-5 text-3xl text-[#f3e6c5]"
              : "mt-5 text-3xl font-semibold text-[#f3e6c5]"
          }
        >
          {fa
            ? "حساب الوریا"
            : "Your Eloria account"}
        </h1>

        <p className="mt-4 text-sm leading-8 text-[#cdbf9d]/65">
          {fa
            ? "با کد یک‌بارمصرف وارد شوید. سفارش‌ها، آدرس‌ها، علاقه‌مندی‌ها و اعلان‌های شما در همین حساب نگهداری می‌شوند."
            : "Sign in with a one-time code. Your orders, addresses, favorites and notifications stay connected to this account."}
        </p>

        {!challengeId ? (
          <>
            <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl border border-[#d8b967]/12 bg-black/15 p-1.5">
              <button
                type="button"
                onClick={() =>
                  changeChannel(
                    "EMAIL",
                  )
                }
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-xs transition ${
                  channel ===
                  "EMAIL"
                    ? "bg-[#173e30] text-[#efd991]"
                    : "text-[#baa982]/55"
                }`}
              >
                <Mail className="h-4 w-4" />
                {fa
                  ? "ورود با ایمیل"
                  : "Email"}
              </button>

              <button
                type="button"
                onClick={() =>
                  changeChannel(
                    "SMS",
                  )
                }
                className="flex h-11 items-center justify-center gap-2 rounded-xl text-xs text-[#baa982]/35"
              >
                <Phone className="h-4 w-4" />
                {fa
                  ? "ورود با موبایل"
                  : "Mobile"}
                <span className="text-[9px] opacity-70">
                  {fa
                    ? "بهزودی"
                    : "Soon"}
                </span>
              </button>
            </div>

            <form
              onSubmit={
                requestCode
              }
              className="mt-6 space-y-4"
            >
              <label className="block text-xs text-[#d9c79e]/65">
                {fa
                  ? "ایمیل"
                  : "Email"}
              </label>

              <div className="relative">
                <Mail className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d7bd72]/50" />

                <input
                  value={email}
                  onChange={e =>
                    setEmail(
                      e.target.value,
                    )
                  }
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                  className="h-13 w-full rounded-2xl border border-[#d8b967]/14 bg-black/20 ps-11 pe-4 text-sm text-[#f1e5c9] outline-none focus:border-[#e2c779]/40"
                />
              </div>

              <label className="block text-xs text-[#d9c79e]/65">
                {fa
                  ? "شماره موبایل"
                  : "Mobile number"}
              </label>

              <div className="relative">
                <Phone className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d7bd72]/50" />

                <input
                  value={mobile}
                  onChange={e =>
                    setMobile(
                      e.target.value,
                    )
                  }
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="09121234567"
                  required
                  className="h-13 w-full rounded-2xl border border-[#d8b967]/14 bg-black/20 ps-11 pe-4 text-sm text-[#f1e5c9] outline-none focus:border-[#e2c779]/40"
                />
              </div>

              <p className="text-[11px] leading-6 text-[#bcae8d]/45">
                {fa
                  ? "کد ورود به ایمیل ارسال می‌شود. شماره موبایل برای اتصال امن حساب به سفارش‌ها استفاده می‌شود و در این مرحله پیامکی برای آن ارسال نمی‌شود."
                  : "The login code is sent by email. Your mobile number links the account securely to orders; no SMS is sent at this stage."}
              </p>

              <TurnstileWidget
                locale={locale}
                action="customer-login"
                onTokenChange={
                  onTokenChange
                }
              />

              <button
                disabled={loading}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[#e3c873]/30 bg-[#143c2d] text-sm text-[#efd991] disabled:opacity-50"
              >
                {loading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}

                {fa
                  ? "دریافت کد ورود"
                  : "Send login code"}
              </button>
            </form>
          </>
        ) : (
          <form
            onSubmit={
              verifyCode
            }
            className="mt-8 space-y-4"
          >
            <div className="rounded-2xl border border-[#d8b967]/10 bg-black/15 p-4">
              <p className="text-xs text-[#d8c59a]/55">
                {fa
                  ? "کد به این ایمیل ارسال شد:"
                  : "Code sent to:"}
              </p>

              <p className="mt-2 break-all text-sm text-[#efd991]">
                {email}
              </p>
            </div>

            <label className="block text-xs text-[#d9c79e]/65">
              {fa
                ? "کد ۶ رقمی"
                : "6-digit code"}
            </label>

            <input
              value={code}
              onChange={e =>
                setCode(
                  e.target.value
                    .replace(
                      /\D/g,
                      "",
                    )
                    .slice(0, 6),
                )
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="h-14 w-full rounded-2xl border border-[#d8b967]/14 bg-black/20 px-4 text-center font-mono text-xl tracking-[.35em] text-[#f1e5c9] outline-none focus:border-[#e2c779]/40"
            />

            {devCode ? (
              <p className="rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3 text-xs text-amber-100/70">
                DEV OTP:{" "}
                {devCode}
              </p>
            ) : null}

            <button
              disabled={
                loading ||
                code.length !== 6
              }
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[#e3c873]/30 bg-[#143c2d] text-sm text-[#efd991] disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}

              {fa
                ? "ورود به حساب"
                : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => {
                setChallengeId(
                  null,
                );
                setCode("");
                setMessage(null);
                setDevCode(null);
              }}
              className="w-full py-2 text-xs text-[#c5b58f]/55"
            >
              {fa
                ? "تغییر اطلاعات / ارسال دوباره"
                : "Change details / resend"}
            </button>
          </form>
        )}

        {message ? (
          <p className="mt-5 rounded-xl border border-[#d8b967]/10 bg-black/15 p-3 text-xs leading-6 text-[#ded0ad]/75">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
