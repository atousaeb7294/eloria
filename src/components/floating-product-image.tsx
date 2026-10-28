"use client";

import Image from "next/image";
import { useState } from "react";
import { heroImageLoader, isPreparedHeroSource } from "@/lib/hero-image-variants";

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
  onReady?: () => void;
};

function TransparentPhoto({ cutoutSrc, alt, sizes, priority, onReady }: Props) {
  const [failures, setFailures] = useState(0);
  const optimized = Boolean(cutoutSrc && isPreparedHeroSource(cutoutSrc) && failures === 0);
  if (!cutoutSrc || failures > 1) return <div className="eloria-hero-image-unavailable" role="img" aria-label={alt}><span>ELORIA</span></div>;
  return <Image src={cutoutSrc} alt={alt} fill sizes={sizes} preload={priority}
    loader={optimized ? heroImageLoader : undefined} unoptimized={!optimized}
    className="eloria-transparent-hero" onLoad={onReady}
    onError={() => { setFailures(value => value + 1); onReady?.(); }} />;
}

/** Never fall back to an opaque gallery photo or poll the cutout service. */
export function FloatingProductImage(props: Props) {
  return <FloatingPhoto key={props.cutoutSrc} {...props} />;
}

function FloatingPhoto({
  scale = 90,
  paused = false,
  onReady,
  ...image
}: Props) {
  const [ready, setReady] = useState(false);
  return (
    <div className="eloria-floating-product" data-paused={paused || !ready}>
      <div className="eloria-floating-motion">
        <div
          className="eloria-floating-scale"
          style={{ transform: `scale(${Math.min(100, Math.max(60, scale)) / 100})` }}
        >
          <TransparentPhoto {...image} onReady={() => { setReady(true); onReady?.(); }} />
        </div>
      </div>
    </div>
  );
}
