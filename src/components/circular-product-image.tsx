"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { observeCutout } from "@/lib/cutout-client";

type Props = { src: string; imageId?: string; cutoutSrc?: string; alt: string; sizes: string; priority?: boolean; floating?: boolean; unoptimized?: boolean };

export function CircularProductImage(props: Props) {
  return <CircularImage key={`${props.src}:${props.cutoutSrc ?? ""}`} {...props} />;
}

function CircularImage({ src, imageId, cutoutSrc, alt, sizes, priority = false, floating = false, unoptimized = false }: Props) {
  const seat = useRef<HTMLDivElement>(null);
  const [prepared, setPrepared] = useState(cutoutSrc);
  const [failed, setFailed] = useState(false);
  const [originalFailed, setOriginalFailed] = useState(false);
  useEffect(() => {
    if (!imageId || prepared || !seat.current) return;
    let unsubscribe: (() => void) | undefined;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        unsubscribe ??= observeCutout(imageId, setPrepared);
      } else { unsubscribe?.(); unsubscribe = undefined; }
    }, { rootMargin: "150px" });
    observer.observe(seat.current);
    return () => { observer.disconnect(); unsubscribe?.(); };
  }, [imageId, prepared]);
  const cutout = Boolean(prepared && !failed);
  return (
    <div ref={seat} className={`eloria-circle-photo${cutout ? " is-cutout" : " is-original"}${floating ? " is-floating" : ""}`}>
      <div className="eloria-circle-subject">
          <Image
            src={cutout ? prepared! : originalFailed ? "/images/brand/eloria-logo.webp" : src}
            alt={originalFailed && !cutout ? `${alt} — تصویر در دسترس نیست` : alt}
            fill sizes={sizes} quality={88} preload={priority} unoptimized={unoptimized}
            onError={() => cutout ? setFailed(true) : setOriginalFailed(true)}
          />
      </div>
    </div>
  );
}
