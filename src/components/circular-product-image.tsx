"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { circularPhotoSize } from "@/lib/circular-image";

type Props = { src: string; cutoutSrc?: string; alt: string; sizes: string; priority?: boolean; floating?: boolean };

export function CircularProductImage(props: Props) {
  return <CircularImage key={`${props.src}:${props.cutoutSrc ?? ""}`} {...props} />;
}

function CircularImage({ src, cutoutSrc, alt, sizes, priority = false, floating = false }: Props) {
  const [cutoutFailed, setCutoutFailed] = useState(false);
  const [originalFailed, setOriginalFailed] = useState(false);
  const [fit, setFit] = useState(70);
  const cutout = Boolean(cutoutSrc && !cutoutFailed);
  return (
    <div className={`eloria-circle-photo${cutout ? " is-cutout" : " is-original"}${floating ? " is-floating" : ""}`}
      style={{ "--circle-photo-fit": `${fit}%` } as CSSProperties}>
      {!cutout && !originalFailed && <Image className="eloria-circle-ambient" src={src} alt="" aria-hidden="true" fill sizes={sizes} priority={priority} />}
      <div className="eloria-circle-subject">
        <Image
          src={cutout ? cutoutSrc! : originalFailed ? "/images/brand/eloria-logo.webp" : src}
          alt={originalFailed && !cutout ? `${alt} — تصویر در دسترس نیست` : alt}
          unoptimized={cutout}
          fill sizes={sizes} priority={priority}
          onLoad={event => setFit(circularPhotoSize(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight))}
          onError={() => cutout ? setCutoutFailed(true) : setOriginalFailed(true)}
        />
      </div>
    </div>
  );
}
