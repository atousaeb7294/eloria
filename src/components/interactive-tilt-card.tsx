"use client";

import type {
  CSSProperties,
  PointerEvent,
  ReactNode,
} from "react";
import {
  useRef,
} from "react";

import {
  cn,
} from "@/lib/utils";

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
  return window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
}

export function InteractiveTiltCard({
  children,
  className,
  maxTilt = 7,
  lift = 7,
}: InteractiveTiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const resetCard = () => {
    const card = cardRef.current;

    if (!card) {
      return;
    }

    card.style.setProperty(
      "--tilt-rotate-x",
      "0deg",
    );
    card.style.setProperty(
      "--tilt-rotate-y",
      "0deg",
    );
    card.style.setProperty(
      "--tilt-lift",
      "0px",
    );
    card.style.setProperty(
      "--tilt-shine-opacity",
      "0",
    );
  };

  const handlePointerMove = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (
      event.pointerType !== "mouse" ||
      prefersReducedMotion()
    ) {
      return;
    }

    const card = cardRef.current;

    if (!card) {
      return;
    }

    const bounds = card.getBoundingClientRect();
    const relativeX =
      (event.clientX - bounds.left) /
      bounds.width;
    const relativeY =
      (event.clientY - bounds.top) /
      bounds.height;

    const rotateY =
      (relativeX - 0.5) * maxTilt * 2;
    const rotateX =
      (0.5 - relativeY) * maxTilt * 2;

    card.style.setProperty(
      "--tilt-rotate-x",
      `${rotateX.toFixed(2)}deg`,
    );
    card.style.setProperty(
      "--tilt-rotate-y",
      `${rotateY.toFixed(2)}deg`,
    );
    card.style.setProperty(
      "--tilt-lift",
      `-${lift}px`,
    );
    card.style.setProperty(
      "--tilt-shine-x",
      `${(relativeX * 100).toFixed(1)}%`,
    );
    card.style.setProperty(
      "--tilt-shine-y",
      `${(relativeY * 100).toFixed(1)}%`,
    );
    card.style.setProperty(
      "--tilt-shine-opacity",
      "1",
    );
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetCard}
      onPointerCancel={resetCard}
      className={cn(
        "relative isolate transform-gpu transition-[transform] duration-200 ease-out will-change-transform motion-reduce:transform-none motion-reduce:transition-none",
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
            "radial-gradient(circle at var(--tilt-shine-x) var(--tilt-shine-y), rgba(255, 236, 184, 0.2), rgba(233, 199, 111, 0.07) 18%, transparent 43%)",
        }}
      />
    </div>
  );
}
