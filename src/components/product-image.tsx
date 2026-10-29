"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { localMediaLoader } from "@/lib/local-media-loader";

/** Keep the frame stable if old external media is unavailable. A branded
 * placeholder must never pretend to be a different product. */
export function ProductImage({ src, alt, onError, ...props }: ImageProps) {
  const [failedSource, setFailedSource] = useState<ImageProps["src"] | null>(
    null,
  );
  const unavailable = failedSource === src;
  return (
    <Image
      {...props}
      loader={props.loader ?? (!unavailable && !props.unoptimized ? localMediaLoader(src) : undefined)}
      src={unavailable ? "/images/brand/eloria-logo.webp" : src}
      alt={
        unavailable ? `${alt} — تصویر در دسترس نیست / Image unavailable` : alt
      }
      onError={(event) => {
        setFailedSource(src);
        onError?.(event);
      }}
    />
  );
}
