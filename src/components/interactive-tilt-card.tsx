"use client";

import type {
  CSSProperties,
  PointerEvent,
  ReactNode,
} from "react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type InteractiveTiltCardProps = {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  lift?: number;
};

type TiltStyle = CSSProperties & {
  "--tilt-rotate-x"?: string;
  "--tilt-rotate-y"?: string;
  "--tilt-lift"?: string;
  "--tilt-shine-x"?: string;
  "--tilt-shine-y"?: string;
  "--tilt-shine-opacity"?: string;
};

const baseStyle: TiltStyle = {
  "--tilt-rotate-x": "0deg",
  "--tilt-rotate-y": "0deg",
  "--tilt-lift": "0px",
  "--tilt-shine-x": "50%",
  "--tilt-shine-y": "50%",
  "--tilt-shine-opacity": "0",
  transform:
    "perspective(1100px) rotateX(var(--tilt-rotate-x)) rotateY(var(--tilt-rotate-y)) translate3d(0, var(--tilt-lift), 0)",
  transformStyle: "preserve-3d",
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function InteractiveTiltCard({
  children,
  className,
  maxTilt = 5,
  lift = 5,
}: InteractiveTiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<DOMRect | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);

  const cancelPendingFrame = () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  const resetCard = () => {
    cancelPendingFrame();
    boundsRef.current = null;
    pointerRef.current = null;

    const card = cardRef.current;
    if (!card) return;

    card.style.setProperty("--tilt-rotate-x", "0deg");
    card.style.setProperty("--tilt-rotate-y", "0deg");
    card.style.setProperty("--tilt-lift", "0px");
    card.style.setProperty("--tilt-shine-opacity", "0");
    card.style.willChange = "auto";
  };

  const renderTilt = () => {
    frameRef.current = null;

    const card = cardRef.current;
    const bounds = boundsRef.current;
    const pointer = pointerRef.current;

    if (!card || !bounds || !pointer) return;

    const relativeX = Math.min(
      1,
      Math.max(0, (pointer.x - bounds.left) / bounds.width),
    );
    const relativeY = Math.min(
      1,
      Math.max(0, (pointer.y - bounds.top) / bounds.height),
    );

    const rotateY = (relativeX - 0.5) * maxTilt * 2;
    const rotateX = (0.5 - relativeY) * maxTilt * 2;

    card.style.setProperty("--tilt-rotate-x", `${rotateX.toFixed(2)}deg`);
    card.style.setProperty("--tilt-rotate-y", `${rotateY.toFixed(2)}deg`);
    card.style.setProperty("--tilt-lift", `-${lift}px`);
    card.style.setProperty(
      "--tilt-shine-x",
      `${(relativeX * 100).toFixed(1)}%`,
    );
    card.style.setProperty(
      "--tilt-shine-y",
      `${(relativeY * 100).toFixed(1)}%`,
    );
    card.style.setProperty("--tilt-shine-opacity", "1");
  };

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return;

    boundsRef.current = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.willChange = "transform";
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return;

    if (!boundsRef.current) {
      boundsRef.current = event.currentTarget.getBoundingClientRect();
    }

    pointerRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    if (frameRef.current === null) {
      frameRef.current = window.requestAnimationFrame(renderTilt);
    }
  };

  useEffect(() => {
    return () => {
      cancelPendingFrame();
    };
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetCard}
      onPointerCancel={resetCard}
      className={cn(
        "relative isolate transform-gpu transition-[transform] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
      style={baseStyle}
    >
      {children}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] opacity-[var(--tilt-shine-opacity)] mix-blend-screen transition-opacity duration-300 motion-reduce:hidden"
        style={{
          background:
            "radial-gradient(circle at var(--tilt-shine-x) var(--tilt-shine-y), rgba(255, 236, 184, 0.18), rgba(233, 199, 111, 0.06) 18%, transparent 43%)",
        }}
      />
    </div>
  );
}
