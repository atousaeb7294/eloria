"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

import { recordClientMeasurement } from "@/lib/site-measurement-client";

type ProductShareActionsProps = {
  locale: string;
  slug: string;
  title: string;
};

export function ProductShareActions({ locale, slug, title }: ProductShareActionsProps) {
  const fa = locale === "fa";
  const [copied, setCopied] = useState(false);

  const recordShare = () => {
    recordClientMeasurement({
      event_type: "share_product",
      locale: fa ? "fa" : "en",
      path: window.location.pathname,
      product_slug: slug,
    });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        recordShare();
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      recordShare();
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // A cancelled native share is not an application error.
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      recordShare();
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permission can be denied; keep the product page usable.
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={share}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d9b85f]/24 bg-[#d9b85f]/[0.045] px-4 text-[11px] text-[#e7cf8a] transition hover:border-[#ead17f]/50"
      >
        <Share2 className="h-3.5 w-3.5" />
        {fa ? "اشتراک‌گذاری این اثر" : "Share this piece"}
      </button>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/[0.08] px-4 text-[11px] text-[#cdbf9f]/68 transition hover:border-white/[0.16]"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? (fa ? "لینک کپی شد" : "Link copied") : (fa ? "کپی لینک" : "Copy link")}
      </button>
    </div>
  );
}
