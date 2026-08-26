"use client";

import { Check, Copy, Gift, X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "eloria_welcome_offer_seen_v1";
const PROMO_CODE = "ELORIA50";

export function WelcomeOffer({ locale }: { locale: "fa" | "en" }) {
  const fa = locale === "fa";
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
      const timer = window.setTimeout(() => setOpen(true), 1_200);
      return () => window.clearTimeout(timer);
    } catch {
      const timer = window.setTimeout(() => setOpen(true), 1_200);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const close = () => {
    setOpen(false);
    try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* optional preference */ }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  };

  if (!open) return null;

  return (
    <aside dir={fa ? "rtl" : "ltr"} className="fixed inset-x-4 bottom-20 z-[95] mx-auto max-w-lg rounded-[1.6rem] border border-[#e7ca76]/40 bg-[linear-gradient(145deg,rgba(5,48,34,.98),rgba(2,20,14,.99))] p-4 shadow-[0_28px_90px_rgba(0,0,0,.62)] backdrop-blur-2xl sm:bottom-24 sm:p-5" role="status" aria-live="polite">
      <button type="button" onClick={close} aria-label={fa ? "بستن پیشنهاد" : "Close offer"} className="absolute end-3 top-3 grid size-8 place-items-center rounded-full border border-white/10 text-white/55 hover:text-[#f0d98b]">
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3 pe-9">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#e7ca76]/28 bg-[#d8b967]/[.09] text-[#f0d887]"><Gift className="size-5" /></span>
        <div>
          <p className="text-sm font-medium text-[#f5e8c8]">{fa ? "هدیه اولین خرید شما" : "Your first-purchase gift"}</p>
          <p className="mt-1 text-xs leading-6 text-[#d3c4a2]/68">{fa ? "۵۰ هزار تومان تخفیف برای اولین خرید؛ اعتبار در زمان ثبت سفارش با شماره موبایل بررسی می‌شود." : "50,000 Toman off your first purchase. Eligibility is verified by mobile number at checkout."}</p>
        </div>
      </div>
      <button type="button" onClick={() => void copy()} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#e8cc78]/38 bg-[#d8b967]/[.08] font-mono text-sm tracking-[.16em] text-[#f3db94] transition hover:bg-[#d8b967]/[.14]">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? (fa ? "کپی شد" : "Copied") : PROMO_CODE}
      </button>
    </aside>
  );
}
