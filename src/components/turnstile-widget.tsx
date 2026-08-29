"use client";

import Script from "next/script";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({
  onTokenChange,
  locale,
  action = "checkout",
}: {
  onTokenChange: (token: string | null) => void;
  locale: "fa" | "en";
  action?:
    | "checkout"
    | "customer-login"
    | "support-contact"
    | "support-chat";
}) {
  const [siteKey, setSiteKey] = useState("");

  const id =
    `eloria-turnstile-${useId().replace(/:/g, "")}`;

  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/public/turnstile-config", {
      cache: "no-store",
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("turnstile-config-failed");
        }

        return response.json() as Promise<{
          siteKey?: string;
        }>;
      })
      .then(data => {
        if (!active) {
          return;
        }

        const nextSiteKey =
          typeof data.siteKey === "string"
            ? data.siteKey.trim()
            : "";

        setSiteKey(nextSiteKey);

        if (!nextSiteKey) {
          onTokenChange(null);
        }
      })
      .catch(() => {
        if (active) {
          setSiteKey("");
          onTokenChange(null);
        }
      });

    return () => {
      active = false;
    };
  }, [onTokenChange]);

  const render = useCallback(() => {
    if (
      !siteKey ||
      !window.turnstile ||
      widgetId.current
    ) {
      return;
    }

    widgetId.current = window.turnstile.render(
      `#${id}`,
      {
        sitekey: siteKey,
        theme: "dark",
        language:
          locale === "fa"
            ? "fa"
            : "en",
        action,
        callback: (token: string) =>
          onTokenChange(token),
        "expired-callback": () =>
          onTokenChange(null),
        "error-callback": () =>
          onTokenChange(null),
      },
    );
  }, [
    action,
    id,
    locale,
    onTokenChange,
    siteKey,
  ]);

  useEffect(() => {
    if (!siteKey) {
      return;
    }

    const timer = window.setInterval(
      render,
      250,
    );

    render();

    return () => {
      window.clearInterval(timer);

      if (
        widgetId.current &&
        window.turnstile
      ) {
        window.turnstile.remove(
          widgetId.current,
        );
        widgetId.current = null;
      }
    };
  }, [render, siteKey]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className="mt-5 flex justify-center overflow-hidden rounded-xl border border-[#d9b85f]/12 bg-black/10 p-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={render}
      />
      <div id={id} />
    </div>
  );
}
