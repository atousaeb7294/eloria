"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { getSiteMeasurementConsent, setSiteMeasurementConsent } from "@/lib/site-measurement-client";

export function MeasurementPreferencesButton({ locale }: { locale: string }) {
  const fa = locale === "fa";
  const [enabled, setEnabled] = useState(false);
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);

  useEffect(() => {
    const sync = () => {
      setEnabled(document.documentElement.dataset.eloriaMeasurement === "enabled");
      setConsent(getSiteMeasurementConsent());
    };
    sync();
    window.addEventListener("eloria:measurement-consent", sync);
    window.addEventListener("eloria:measurement-ready", sync);
    return () => {
      window.removeEventListener("eloria:measurement-consent", sync);
      window.removeEventListener("eloria:measurement-ready", sync);
    };
  }, []);

  if (!enabled || !consent) return null;

  const granted = consent === "granted";
  return (
    <button
      type="button"
      onClick={() => setSiteMeasurementConsent(granted ? "denied" : "granted")}
      className="inline-flex min-h-9 items-center gap-2 text-[#d8c17c]/68 transition-colors duration-300 hover:text-[#f0d793] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfc16f]/38"
    >
      <SlidersHorizontal aria-hidden="true" className="size-3.5" />
      {granted
        ? (fa ? "غیرفعال‌کردن سنجش ناشناس" : "Disable anonymous measurement")
        : (fa ? "فعال‌سازی سنجش ناشناس" : "Enable anonymous measurement")}
    </button>
  );
}
