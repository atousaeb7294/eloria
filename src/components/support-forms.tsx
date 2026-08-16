"use client";

import type {
  FormEvent,
} from "react";
import {
  useCallback,
  useState,
} from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Search,
  Send,
  ShieldAlert,
} from "lucide-react";

import {
  TurnstileWidget,
} from "@/components/turnstile-widget";

type SupportFormProps = {
  locale: string;
};

type SubmitState = {
  kind:
    | "idle"
    | "loading"
    | "success"
    | "error";
  message: string;
};

export function ContactRequestForm({
  locale,
}: SupportFormProps) {
  const isPersian =
    locale === "fa";

  const safeLocale:
    "fa" | "en" =
      isPersian
        ? "fa"
        : "en";

  const [
    state,
    setState,
  ] = useState<SubmitState>({
    kind: "idle",
    message: "",
  });

  const [
    turnstileToken,
    setTurnstileToken,
  ] = useState<string | null>(
    null,
  );
  const [
    turnstileGeneration,
    setTurnstileGeneration,
  ] = useState(0);

  const onTokenChange =
    useCallback(
      (
        token:
          string | null,
      ) => {
        setTurnstileToken(
          token,
        );
      },
      [],
    );

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const form =
      event.currentTarget;
    const data =
      new FormData(form);

    setState({
      kind: "loading",
      message: "",
    });

    try {
      const response =
        await fetch(
          "/api/support/contact",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body:
              JSON.stringify({
                name:
                  data.get(
                    "name",
                  ),
                phone:
                  data.get(
                    "phone",
                  ),
                subject:
                  data.get(
                    "subject",
                  ),
                message:
                  data.get(
                    "message",
                  ),
                turnstileToken,
              }),
          },
        );

      const result =
        await response
          .json()
          .catch(
            () => null,
          ) as
          | {
              successful?:
                boolean;
              message?:
                string;
            }
          | null;

      if (
        !response.ok ||
        !result?.successful
      ) {
        throw new Error(
          result?.message ||
            (
              isPersian
                ? "ارسال پیام انجام نشد."
                : "Message delivery failed."
            ),
        );
      }

      form.reset();
      setTurnstileToken(
        null,
      );
      setTurnstileGeneration(
        current => current + 1,
      );
      setState({
        kind: "success",
        message:
          result.message ||
          (
            isPersian
              ? "درخواست ثبت شد."
              : "Request submitted."
          ),
      });
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : (
                isPersian
                  ? "ارسال پیام انجام نشد."
                  : "Message delivery failed."
              ),
      });
    }
  }

  return (
    <form
      onSubmit={submit}
      className="eloria-panel rounded-[2.2rem] p-5 sm:p-8"
      data-reveal="left"
    >
      <p className="eloria-kicker">
        {isPersian
          ? "فرم ارتباط"
          : "Contact form"}
      </p>

      <h2 className="mt-3 text-2xl font-semibold text-[#f2e4c5]">
        {isPersian
          ? "پیام خود را ثبت کنید"
          : "Leave your message"}
      </h2>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-xs text-[#d8c9a6]/72">
          <span>
            {isPersian
              ? "نام و نام خانوادگی"
              : "Full name"}
          </span>
          <input
            className="eloria-field"
            required
            name="name"
            autoComplete="name"
          />
        </label>

        <label className="space-y-2 text-xs text-[#d8c9a6]/72">
          <span>
            {isPersian
              ? "شماره تماس"
              : "Phone number"}
          </span>
          <input
            className="eloria-field"
            required
            name="phone"
            inputMode="tel"
            autoComplete="tel"
          />
        </label>
      </div>

      <label className="mt-4 block space-y-2 text-xs text-[#d8c9a6]/72">
        <span>
          {isPersian
            ? "موضوع"
            : "Subject"}
        </span>
        <input
          className="eloria-field"
          required
          name="subject"
        />
      </label>

      <label className="mt-4 block space-y-2 text-xs text-[#d8c9a6]/72">
        <span>
          {isPersian
            ? "متن پیام"
            : "Message"}
        </span>
        <textarea
          className="eloria-field min-h-36 resize-y py-4"
          minLength={10}
          required
          name="message"
        />
      </label>

      <TurnstileWidget
        key={turnstileGeneration}
        locale={safeLocale}
        action="support-contact"
        onTokenChange={
          onTokenChange
        }
      />

      <button
        disabled={
          state.kind ===
          "loading"
        }
        className="eloria-button-primary mt-6 w-full disabled:opacity-60 sm:w-auto"
        type="submit"
      >
        {state.kind ===
        "loading" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {state.kind ===
        "loading"
          ? (
              isPersian
                ? "در حال ارسال…"
                : "Sending…"
            )
          : (
              isPersian
                ? "ثبت درخواست"
                : "Submit request"
            )}
      </button>

      {state.kind ===
      "success" ? (
        <div
          role="status"
          className="mt-5 flex gap-3 rounded-2xl border border-emerald-200/18 bg-emerald-950/20 p-4 text-xs leading-7 text-emerald-100"
        >
          <CheckCircle2 className="mt-1 size-5 shrink-0" />
          <p>
            {state.message}
          </p>
        </div>
      ) : null}

      {state.kind ===
      "error" ? (
        <div
          role="alert"
          className="mt-5 flex gap-3 rounded-2xl border border-rose-200/18 bg-rose-950/20 p-4 text-xs leading-7 text-rose-100"
        >
          <ShieldAlert className="mt-1 size-5 shrink-0" />
          <p>
            {state.message}
          </p>
        </div>
      ) : null}
    </form>
  );
}

export function OrderTrackingForm({
  locale,
}: SupportFormProps) {
  const isPersian =
    locale === "fa";

  return (
    <form
      action={`/${locale}/order-tracking`}
      method="get"
      className="eloria-panel mx-auto max-w-3xl rounded-[2.2rem] p-5 sm:p-8"
      data-reveal
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-xs text-[#d8c9a6]/72">
          <span>
            {isPersian
              ? "شماره سفارش"
              : "Order number"}
          </span>
          <input
            className="eloria-field"
            required
            name="orderNumber"
          />
        </label>

        <label className="space-y-2 text-xs text-[#d8c9a6]/72">
          <span>
            {isPersian
              ? "شماره موبایل خریدار"
              : "Customer phone"}
          </span>
          <input
            className="eloria-field"
            required
            name="mobile"
            inputMode="tel"
          />
        </label>
      </div>

      <button
        className="eloria-button-primary mt-6 w-full sm:w-auto"
        type="submit"
      >
        <Search className="size-4" />
        {isPersian
          ? "بررسی وضعیت"
          : "Check status"}
      </button>
    </form>
  );
}
