"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { BarChart3, Check, X } from "lucide-react";

import { useIntroComplete } from "@/components/intro/use-intro-complete";
import {
  getSiteMeasurementConsent,
  recordClientMeasurement,
  setSiteMeasurementConsent,
} from "@/lib/site-measurement-client";
import { measurementRouteEvent } from "@/lib/site-measurement";

type SiteMeasurementTrackerProps = {
  locale: "fa" | "en";
  enabled: boolean;
};

function currentLocale(path: string): "fa" | "en" {
  return path.startsWith("/en") ? "en" : "fa";
}

function currentProductSlug(path: string): string | undefined {
  const match = /^\/(?:fa|en)\/products\/([a-z0-9][a-z0-9-]{0,139})$/.exec(path);
  return match?.[1];
}

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const reportWebVital: ReportWebVitalsCallback = (metric) => {
  const path = window.location.pathname;
  const name = metric.name;
  if (name !== "CLS" && name !== "FCP" && name !== "FID" && name !== "INP" && name !== "LCP" && name !== "TTFB") return;
  if (metric.rating !== "good" && metric.rating !== "needs-improvement" && metric.rating !== "poor") return;

  recordClientMeasurement({
    event_type: "web_vital",
    locale: currentLocale(path),
    path,
    metric_name: name,
    metric_value: metric.value,
    metric_rating: metric.rating,
    navigation_type: metric.navigationType,
  });
};

export function SiteMeasurementTracker({ locale, enabled }: SiteMeasurementTrackerProps) {
  const pathname = usePathname();
  const introComplete = useIntroComplete();
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);

  useReportWebVitals(reportWebVital);

  useEffect(() => {
    document.documentElement.dataset.eloriaMeasurement = enabled ? "enabled" : "disabled";
    window.dispatchEvent(new Event("eloria:measurement-ready"));
    return () => {
      delete document.documentElement.dataset.eloriaMeasurement;
    };
  }, [enabled]);

  useEffect(() => {
    const sync = () => setConsent(getSiteMeasurementConsent());
    sync();
    window.addEventListener("eloria:measurement-consent", sync);
    return () => window.removeEventListener("eloria:measurement-consent", sync);
  }, []);

  useEffect(() => {
    if (!enabled || consent !== "granted" || !pathname) return;
    const eventType = measurementRouteEvent(pathname);
    recordClientMeasurement({
      event_type: eventType,
      locale: currentLocale(pathname),
      path: pathname,
      product_slug: currentProductSlug(pathname),
    });
  }, [consent, enabled, pathname]);

  if (!enabled || consent || !introComplete) return null;

  const fa = locale === "fa";
  return (
    <section
      dir={fa ? "rtl" : "ltr"}
      aria-label={fa ? "انتخاب حریم خصوصی" : "Privacy choice"}
      className="fixed bottom-4 start-4 z-[80] w-[min(25rem,calc(100vw-2rem))] rounded-3xl border border-[#dfc16f]/25 bg-[#031a12]/95 p-4 text-[#eadbb7] shadow-[0_18px_60px_rgba(0,0,0,.42)] backdrop-blur-xl"
    >
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[#dfc16f]/20 bg-[#d7b95f]/[.08] text-[#e8cc7a]">
          <BarChart3 className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium">{fa ? "اندازه‌گیری ناشناس عملکرد" : "Anonymous performance measurement"}</p>
          <p className="mt-1 text-xs leading-6 text-[#cdbf9f]/68">
            {fa
              ? "با اجازهٔ شما فقط مسیر صفحه، رویداد خرید و سرعت سایت را بدون نام، شماره، IP یا کوکی تبلیغاتی ثبت می‌کنیم."
              : "With your permission, we measure page paths, shopping events and speed without names, phone numbers, IP addresses or advertising cookies."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSiteMeasurementConsent("granted")}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#dfc16f]/35 bg-[#d7b95f]/[.12] px-3 text-xs text-[#f3dfa1]"
            >
              <Check className="size-3.5" />
              {fa ? "می‌پذیرم" : "Allow"}
            </button>
            <button
              type="button"
              onClick={() => setSiteMeasurementConsent("denied")}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-[#d6c8a9]/76"
            >
              <X className="size-3.5" />
              {fa ? "خیر، ممنون" : "No thanks"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
