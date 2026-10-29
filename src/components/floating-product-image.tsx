"use client";

import Image from "next/image";
import { useState } from "react";
import { heroImageWidth, isPreparedHeroSource } from "@/lib/hero-image-variants";

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
  const [previewReady, setPreviewReady] = useState(false);
  const [detailReady, setDetailReady] = useState(false);
  const [detailWidth, setDetailWidth] = useState<number | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [detailFailed, setDetailFailed] = useState(false);
  const local = Boolean(cutoutSrc && isPreparedHeroSource(cutoutSrc));
  if (!cutoutSrc || (previewFailed && detailFailed)) return <div className="eloria-hero-image-unavailable" role="img" aria-label={alt}><span>ELORIA</span></div>;
  if (!local) return <Image src={cutoutSrc} alt={alt} fill sizes={sizes} preload={priority}
    unoptimized className="eloria-transparent-hero" onLoad={onReady}
    onError={() => { setPreviewFailed(true); setDetailFailed(true); onReady?.(); }} />;
  // A real 480px alpha preview paints first, even on high-DPR phones. Never
  // download the original multi-megabyte PNG after a transient variant error.
  return <>
    <Image src={`${cutoutSrc}?w=480&format=webp`} alt={alt} fill sizes={sizes}
      preload={priority} unoptimized className="eloria-transparent-hero"
      style={{opacity: detailReady ? 0 : 1}}
      onLoad={(event) => {
        setPreviewReady(true); onReady?.();
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
        if (connection?.saveData || /(^|-)2g$|^3g$/.test(connection?.effectiveType ?? "")) return;
        const cap = window.matchMedia("(max-width:760px)").matches ? 640 : 960;
        const wanted = Math.min(cap, Math.ceil(event.currentTarget.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2)));
        if (wanted > 480) setDetailWidth(heroImageWidth(wanted));
      }}
      onError={() => { setPreviewFailed(true); setDetailWidth(640); onReady?.(); }} />
    {(previewReady || previewFailed) && detailWidth !== null && !detailFailed && <Image src={`${cutoutSrc}?w=${detailWidth}&format=webp`} alt="" aria-hidden="true"
      fill sizes={sizes} unoptimized loading="eager" fetchPriority="low"
      className="eloria-transparent-hero" style={{opacity: detailReady ? 1 : 0}}
      onLoad={() => setDetailReady(true)} onError={() => setDetailFailed(true)} />}
  </>;
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
