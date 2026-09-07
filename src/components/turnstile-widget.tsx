"use client";

import Script from "next/script";
import { Check, LoaderCircle, RefreshCw, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export type TurnstileState =
  | "loading"
  | "ready"
  | "verifying"
  | "verified"
  | "error"
  | "disabled";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      execute: (container: string | HTMLElement) => void;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({
  onTokenChange,
  onStateChange,
  locale,
  action = "checkout",
}: {
  onTokenChange: (token: string | null) => void;
  onStateChange?: (state: TurnstileState) => void;
  locale: "fa" | "en";
  action?:
    | "checkout"
    | "customer-login"
    | "customer-password-login"
    | "customer-password-recovery"
    | "admin-login"
    | "support-contact"
    | "support-chat";
}) {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [required, setRequired] = useState(true);
  const [scriptReady, setScriptReady] = useState(false);
  const [state, setState] = useState<TurnstileState>("loading");
  const [scriptGeneration, setScriptGeneration] = useState(0);
  const id = `eloria-turnstile-${useId().replace(/:/g, "")}`;
  const widgetId = useRef<string | null>(null);

  const updateState = useCallback((next: TurnstileState) => {
    setState(next);
    onStateChange?.(next);
  }, [onStateChange]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch("/api/public/turnstile-config", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = (await response.json().catch(() => null)) as { siteKey?: unknown; required?: unknown } | null;
        if (!response.ok || !body) throw new Error("turnstile-config-failed");
        return body;
      })
      .then(data => {
        if (!active) return;
        const nextSiteKey = typeof data.siteKey === "string" ? data.siteKey.trim() : "";
        const nextRequired = data.required !== false;
        setRequired(nextRequired);
        setSiteKey(nextSiteKey);
        if (!nextRequired && !nextSiteKey) updateState("disabled");
        else if (!nextSiteKey) updateState("error");
      })
      .catch(error => {
        if (!active || error instanceof DOMException && error.name === "AbortError") return;
        setSiteKey("");
        updateState("error");
        onTokenChange(null);
      });
    return () => { active = false; controller.abort(); };
  }, [onTokenChange, updateState]);

  useEffect(() => {
    if (!siteKey || scriptReady) return;
    if (window.turnstile) {
      queueMicrotask(() => setScriptReady(true));
      return;
    }
    const timeout = window.setTimeout(() => updateState("error"), 15_000);
    return () => window.clearTimeout(timeout);
  }, [scriptReady, siteKey, updateState]);

  useEffect(() => {
    if (!siteKey || !scriptReady || !window.turnstile || widgetId.current) return;
    try {
      widgetId.current = window.turnstile.render(`#${id}`, {
        sitekey: siteKey,
        theme: "dark",
        size: "flexible",
        language: locale === "fa" ? "fa" : "en",
        action,
        // Cloudflare's default execution mode may issue a token as soon as the
        // widget renders. ELORIA requires an explicit visitor gesture first so
        // login buttons never become active merely because the page loaded.
        appearance: "execute",
        execution: "execute",
        retry: "never",
        callback: (token: string) => { onTokenChange(token); updateState("verified"); },
        "expired-callback": () => { onTokenChange(null); updateState("ready"); },
        "error-callback": () => { onTokenChange(null); updateState("error"); },
        "unsupported-callback": () => { onTokenChange(null); updateState("error"); },
      });
      // Turnstile rendering is an external-system synchronization. Defer the
      // UI notification so this effect itself does not synchronously cascade.
      queueMicrotask(() => updateState("ready"));
    } catch {
      onTokenChange(null);
      queueMicrotask(() => updateState("error"));
    }
  }, [action, id, locale, onTokenChange, scriptGeneration, scriptReady, siteKey, updateState]);

  useEffect(() => () => {
    if (widgetId.current && window.turnstile) {
      window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    }
  }, []);

  if (siteKey === null) {
    return <div className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-xl border border-[#d9b85f]/12 bg-black/10 text-xs text-[#cbbb96]/60" role="status"><LoaderCircle className="size-4 animate-spin" />{locale === "fa" ? "در حال آماده‌سازی تأیید امنیتی…" : "Preparing security verification…"}</div>;
  }
  if (!siteKey) {
    if (!required) return null;
    return <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-950/20 p-3 text-xs leading-6 text-amber-100" role="alert"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><span>{locale === "fa" ? "تأیید «من ربات نیستم» بارگذاری نشد. اتصال اینترنت را بررسی و صفحه را تازه‌سازی کنید." : "The human verification could not load. Check your connection and refresh the page."}</span></div>;
  }

  const retry = () => {
    onTokenChange(null);

    if (widgetId.current && window.turnstile) {
      window.turnstile.remove(widgetId.current);
    }

    widgetId.current = null;
    setScriptReady(Boolean(window.turnstile));
    setScriptGeneration(value => value + 1);
    updateState("loading");
  };

  const startVerification = () => {
    if (
      !widgetId.current ||
      !window.turnstile ||
      state !== "ready"
    ) {
      return;
    }

    onTokenChange(null);
    updateState("verifying");

    try {
      window.turnstile.execute(`#${id}`);
    } catch {
      updateState("error");
    }
  };

  return <div className="mt-5 rounded-xl border border-[#d9b85f]/14 bg-black/10 p-2.5">
    <Script key={scriptGeneration} src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setScriptReady(true)} onLoad={() => setScriptReady(true)} onError={() => updateState("error")} />
    <button
      type="button"
      onClick={startVerification}
      disabled={state !== "ready"}
      aria-pressed={state === "verified"}
      className="mb-2 flex w-full items-center gap-2 rounded-lg px-1 py-1 text-start text-[11px] text-[#d8c69d]/70 transition enabled:hover:text-[#f2dfaa] disabled:cursor-default"
    >
      {state === "verified" ? (
        <Check className="size-4 text-emerald-300" />
      ) : state === "loading" || state === "verifying" ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <span className="size-3.5 rounded border border-[#d8c06c]/55" />
      )}
      <span>
        {state === "verified"
          ? locale === "fa"
            ? "تأیید شد؛ شما ربات نیستید"
            : "Verified — you are human"
          : state === "verifying"
            ? locale === "fa"
              ? "در حال انجام تأیید امنیتی…"
              : "Running security verification…"
            : state === "loading"
              ? locale === "fa"
                ? "در حال آماده‌سازی تأیید امنیتی…"
                : "Preparing security verification…"
              : locale === "fa"
                ? "برای تأیید «من ربات نیستم» کلیک کنید"
                : "Click to verify that you are human"}
      </span>
    </button>
    <div id={id} className="min-h-[65px] w-full overflow-hidden" />
    {state === "error" ? <button type="button" onClick={retry} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300/20 px-3 py-2 text-[11px] text-amber-100"><RefreshCw className="size-3.5" />{locale === "fa" ? "بارگذاری دوباره تأیید امنیتی" : "Reload security verification"}</button> : null}
  </div>;
}
