"use client";

import { useId, type CSSProperties } from "react";
import {
  GATE_CROPS, GATE_OPENING, GATE_SILHOUETTE, GATE_SIZE, GATE_SOURCE_SIZE,
  REFERENCE_GATE_ART, SILVER_LEFT_GLASS, SILVER_RIGHT_GLASS, type GateTreasury,
} from "@/lib/reference-treasury-gate";

/** CSS loads one shared reference image only at the mobile breakpoint. SVG
 * paths are clipping boundaries; every visible ornament comes from the photo. */
export function ReferenceTreasuryGate({ treasury }: { treasury: GateTreasury }) {
  const id = `gate-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const crop = GATE_CROPS[treasury];
  const scale = `scale(${1 / GATE_SIZE.width} ${1 / GATE_SIZE.height})`;
  const silver = treasury === "silver";
  return <div className="reference-treasury-gate" aria-hidden="true" style={{
    "--gate-art": `url("${REFERENCE_GATE_ART}")`,
    "--gate-source-width": `${100 * GATE_SOURCE_SIZE.width / GATE_SIZE.width}%`,
    "--gate-source-height": `${100 * GATE_SOURCE_SIZE.height / GATE_SIZE.height}%`,
    "--gate-source-x": `${100 * crop.x / (GATE_SOURCE_SIZE.width - GATE_SIZE.width)}%`,
    "--gate-source-y": `${100 * crop.y / (GATE_SOURCE_SIZE.height - GATE_SIZE.height)}%`,
    "--gate-left-origin": `${100 * SILVER_LEFT_GLASS.origin / GATE_SIZE.width}%`,
    "--gate-right-origin": `${100 * SILVER_RIGHT_GLASS.origin / GATE_SIZE.width}%`,
    "--gate-left-scale": silver ? SILVER_LEFT_GLASS.scale : 1,
    "--gate-right-scale": silver ? SILVER_RIGHT_GLASS.scale : 1,
  } as CSSProperties}>
    <svg className="reference-gate-clips" width="0" height="0" focusable="false">
      <defs>
        <clipPath id={`${id}-frame`} clipPathUnits="objectBoundingBox">
          <path d={`${GATE_SILHOUETTE} ${GATE_OPENING}`} transform={scale} fillRule="evenodd" clipRule="evenodd" />
        </clipPath>
        <clipPath id={`${id}-opening`} clipPathUnits="objectBoundingBox">
          <path d={GATE_OPENING} transform={scale} />
        </clipPath>
      </defs>
    </svg>
    <div className="reference-gate-frame reference-gate-pixels" style={{ clipPath: `url(#${id}-frame)` }} />
    <div className="reference-gate-opening" style={{ clipPath: `url(#${id}-opening)` }}>
      <div className="reference-gate-leaf reference-gate-left"><div className="reference-gate-pixels" /></div>
      <div className="reference-gate-leaf reference-gate-right"><div className="reference-gate-pixels" /></div>
    </div>
  </div>;
}
