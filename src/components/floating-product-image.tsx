"use client";

import { CircularProductImage } from "@/components/circular-product-image";

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

/** The actual transparent product photo, with a small CSS drift. */
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
          <CircularProductImage {...image} floating />
        </div>
      </div>
    </div>
  );
}
