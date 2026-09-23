"use client";

import { useEffect, useState } from "react";

type GoldRate = {
  material: string;
  pricePerGramToman: string;
  referencePurity: number;
  isStale: boolean;
  marketTimestamp: string | null;
};

/** Displays the raw source rate, never the retail quote or a price with fees. */
export function RawGoldPrice({ locale }: { locale: string }) {
  const fa = locale === "fa";
  const [rate, setRate] = useState<GoldRate | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let busy = false;
    let controller: AbortController | undefined;
    let lastRequest = 0;
    const refresh = async () => {
      if (
        busy ||
        document.visibilityState === "hidden" ||
        Date.now() - lastRequest < 10000
      )
        return;
      busy = true;
      lastRequest = Date.now();
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 8000);
      try {
        const response = await fetch("/api/metal-prices", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          successful?: boolean;
          prices?: GoldRate[];
        };
        const gold = data.prices?.find((item) => item.material === "GOLD");
        if (
          !response.ok ||
          !data.successful ||
          !gold ||
          !/^\d+(\.\d+)?$/.test(gold.pricePerGramToman)
        )
          throw new Error("unavailable");
        if (!disposed) {
          setRate(gold);
          setFailed(false);
        }
      } catch {
        if (!disposed) setFailed(true);
      } finally {
        clearTimeout(timeout);
        busy = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    const resume = () => void refresh();
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  const format = (n: number) =>
    n.toLocaleString(fa ? "fa-IR" : "en-US", { maximumFractionDigits: 0 });
  const label = fa
    ? `هر گرم طلای خام${rate ? (rate.referencePurity === 750 ? " ۱۸ عیار" : ` · عیار ${format(rate.referencePurity)}`) : ""}`
    : `Raw gold / g${rate ? ` · ${format(rate.referencePurity)} fineness` : ""}`;
  return (
    <div
      className="eloria-raw-gold"
      aria-label={fa ? "نرخ طلای خام" : "Raw gold rate"}
    >
      <span>{label}</span>
      <strong>
        {rate
          ? `${format(Number(rate.pricePerGramToman))} ${fa ? "تومان" : "toman"}`
          : fa
            ? failed
              ? "نرخ در دسترس نیست"
              : "دریافت نرخ…"
            : failed
              ? "Rate unavailable"
              : "Loading rate…"}
      </strong>
      {rate && (
        <small>
          {failed
            ? fa
              ? "ارتباط قطع است؛ آخرین نرخ دریافتی"
              : "Offline · last received rate"
            : rate.isStale
              ? fa
                ? "آخرین نرخ ثبت‌شده"
                : "Last recorded rate"
              : fa
                ? "نرخ بازار"
                : "Market rate"}
          {rate.marketTimestamp &&
            ` · ${new Date(rate.marketTimestamp).toLocaleTimeString(fa ? "fa-IR" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" })}`}
        </small>
      )}
    </div>
  );
}
