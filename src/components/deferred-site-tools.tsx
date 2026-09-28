"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { CustomerSupportWidget } from "@/components/customer-support-widget";

const SmartSelectionAssistant = dynamic(
  () =>
    import("@/components/smart-selection-assistant").then(
      module => module.SmartSelectionAssistant,
    ),
  { ssr: false },
);

export function DeferredSiteTools({ locale }: { locale: string }) {
  const [ready, setReady] = useState(false);
  const [selectionRequest, setSelectionRequest] = useState(0);
  const resolvedLocale: "fa" | "en" = locale === "en" ? "en" : "fa";

  useEffect(() => {
    const reveal = () => setReady(true);
    // Keep the request until the lazy chunk mounts; a DOM event cannot be replayed.
    const openSelection = () => {
      setSelectionRequest(current => current + 1);
      reveal();
    };
    window.addEventListener("eloria-open-selection", openSelection);
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown"];
    events.forEach(event => window.addEventListener(event, reveal, { once: true, passive: true }));

    const idleId = idleWindow.requestIdleCallback?.(reveal, { timeout: 2500 });
    const timerId = idleId === undefined ? window.setTimeout(reveal, 1800) : null;

    return () => {
      window.removeEventListener("eloria-open-selection", openSelection);
      events.forEach(event => window.removeEventListener(event, reveal));
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, []);

  return (
    <>
      {ready ? <SmartSelectionAssistant key={selectionRequest} locale={resolvedLocale} initiallyOpen={selectionRequest > 0} /> : null}
      <CustomerSupportWidget locale={resolvedLocale} />
    </>
  );
}
