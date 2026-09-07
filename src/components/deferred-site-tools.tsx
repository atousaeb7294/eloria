"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SmartSelectionAssistant = dynamic(
  () =>
    import("@/components/smart-selection-assistant").then(
      module => module.SmartSelectionAssistant,
    ),
  { ssr: false },
);

const CustomerSupportWidget = dynamic(
  () =>
    import("@/components/customer-support-widget").then(
      module => module.CustomerSupportWidget,
    ),
  { ssr: false },
);

export function DeferredSiteTools({ locale }: { locale: string }) {
  const [ready, setReady] = useState(false);
  const resolvedLocale: "fa" | "en" = locale === "en" ? "en" : "fa";

  useEffect(() => {
    const reveal = () => setReady(true);
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll"];
    events.forEach(event => window.addEventListener(event, reveal, { once: true, passive: true }));

    const idleId = idleWindow.requestIdleCallback?.(reveal, { timeout: 2500 });
    const timerId = idleId === undefined ? window.setTimeout(reveal, 1800) : null;

    return () => {
      events.forEach(event => window.removeEventListener(event, reveal));
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      <SmartSelectionAssistant locale={resolvedLocale} />
      <CustomerSupportWidget locale={resolvedLocale} />
    </>
  );
}
