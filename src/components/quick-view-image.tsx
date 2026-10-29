"use client";

import Image from "next/image";
import { useState } from "react";
import { currentQuickViewSource, QUICK_VIEW_SIZES } from "@/lib/quick-view-media";

/** The selected card stays visible while its larger original photograph loads. */
export function QuickViewImage({ src, previewSrc, alt, locale }: {
  src: string; previewSrc?: string; alt: string; locale: "fa" | "en";
}) {
  const [detail] = useState(() => currentQuickViewSource(src));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const preview = previewSrc && !previewFailed;
  return <div className="quick-photo-stack" aria-busy={!ready && !failed}>
    {preview && !ready && <Image src={previewSrc} alt="" aria-hidden="true" fill unoptimized
      loading="eager" className="quick-photo-preview" onError={() => setPreviewFailed(true)} />}
    {!failed && <Image key={attempt} src={detail ?? src} alt={alt} fill
      unoptimized={Boolean(detail)} sizes={QUICK_VIEW_SIZES} loading="eager" fetchPriority="high"
      className={`quick-photo-detail${ready ? " is-ready" : ""}`}
      onLoad={() => setReady(true)} onError={() => setFailed(true)} />}
    {!preview && !ready && !failed && <span className="quick-photo-status" role="status">
      {locale === "fa" ? "در حال دریافت عکس…" : "Loading photograph…"}
    </span>}
    {failed && <button className="quick-photo-retry" type="button" onClick={() => {
      setFailed(false); setAttempt(value => value + 1);
    }}>
      {locale === "fa" ? "دریافت دوبارهٔ عکس واضح‌تر" : "Retry detailed photograph"}
    </button>}
  </div>;
}
