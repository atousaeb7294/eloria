"use client";
import { useState, useRef, useEffect } from "react";
export function EnamadSeal() {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const image = imageRef.current;
      if (image?.complete && image.naturalWidth === 0) setFailed(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return <a href="https://trustseal.enamad.ir/?id=7632947&Code=TKWqLb98pevDEO1yEhZaHGCVgpfLlxKr" target="_blank" referrerPolicy="origin" aria-label="استعلام اینماد الوریا" className="grid size-32 place-items-center rounded-xl border border-[#dfc16f]/20 bg-black/15 p-2 text-center text-xs leading-6 text-[#dfc16f]">
    {failed ? <span>مشاهدهٔ وضعیت اینماد<br/>در سامانهٔ رسمی ↗</span> :
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={imageRef} src="https://trustseal.enamad.ir/logo.aspx?id=7632947&Code=TKWqLb98pevDEO1yEhZaHGCVgpfLlxKr" {...{ code: "TKWqLb98pevDEO1yEhZaHGCVgpfLlxKr" }} referrerPolicy="origin" alt="اینماد الوریا" width="112" height="112" loading="lazy" decoding="async" className="size-28 object-contain" onError={() => setFailed(true)} />}
  </a>;
}
