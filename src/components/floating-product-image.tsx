"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  imageId?: string;
  cutoutSrc?: string;
  alt: string;
  sizes: string;
  scale?: number;
  paused?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
};

function TransparentPhoto({ cutoutSrc, alt, sizes, priority }: Props) {
  const [failed, setFailed] = useState(false);
  if (!cutoutSrc || failed) return <div className="eloria-hero-image-unavailable" role="img" aria-label={alt}><span>ELORIA</span></div>;
  return <Image src={cutoutSrc} alt={alt} fill unoptimized sizes={sizes} preload={priority}
    className="eloria-transparent-hero" onError={() => setFailed(true)} />;
}

/** Never fall back to an opaque gallery photo or poll the cutout service. */
export function FloatingProductImage({
  scale = 90,
  paused = false,
  ...image
}: Props) {
  return (
    <div className="eloria-floating-product" data-paused={paused}>
      <div className="eloria-floating-motion">
        <div
          className="eloria-floating-scale"
          style={{ transform: `scale(${Math.min(100, Math.max(60, scale)) / 100})` }}
        >
          <TransparentPhoto key={image.cutoutSrc} {...image} />
        </div>
      </div>
    </div>
  );
}
