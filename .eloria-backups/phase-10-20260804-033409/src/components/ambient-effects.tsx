"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

type PowderStyle = CSSProperties & {
  "--left": string;
  "--top": string;
  "--width": string;
  "--height": string;
  "--opacity": string;
  "--duration": string;
  "--delay": string;
  "--rotation": string;
  "--drift-x": string;
  "--drift-y": string;
  "--blur": string;
};

const goldPowder: PowderStyle[] = Array.from(
  { length: 110 },
  (_, index) => {
    const left = (index * 47 + (index % 7) * 11) % 100;
    const top = (index * 67 + (index % 5) * 13) % 100;

    const width = 1.5 + ((index * 17) % 7);
    const height = 0.8 + ((index * 11) % 4);

    const opacity =
      0.14 + (((index * 19) % 42) / 100);

    const duration = 9 + ((index * 13) % 15);
    const delay = -((index * 7) % 18);

    const rotation = (index * 29) % 180;
    const driftX = -30 + ((index * 23) % 85);
    const driftY = -52 + ((index * 31) % 70);

    const blur =
      index % 5 === 0
        ? "1.1px"
        : index % 3 === 0
          ? "0.45px"
          : "0px";

    return {
      "--left": `${left}%`,
      "--top": `${top}%`,
      "--width": `${width}px`,
      "--height": `${height}px`,
      "--opacity": `${opacity}`,
      "--duration": `${duration}s`,
      "--delay": `${delay}s`,
      "--rotation": `${rotation}deg`,
      "--drift-x": `${driftX}px`,
      "--drift-y": `${driftY}px`,
      "--blur": blur,
    };
  },
);

export function AmbientEffects() {
  const cursorGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursorGlow = cursorGlowRef.current;

    if (!cursorGlow) {
      return;
    }

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (!finePointer.matches || reducedMotion.matches) {
      cursorGlow.style.display = "none";
      return;
    }

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;

    let currentX = targetX;
    let currentY = targetY;

    let animationFrame = 0;

    const handlePointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;

      cursorGlow.style.opacity = "1";
    };

    const handlePointerLeave = () => {
      cursorGlow.style.opacity = "0";
    };

    const handlePointerEnter = () => {
      cursorGlow.style.opacity = "1";
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      cursorGlow.style.transform = `
        translate3d(${currentX}px, ${currentY}px, 0)
        translate(-50%, -50%)
      `;

      animationFrame = window.requestAnimationFrame(animate);
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      {
        passive: true,
      },
    );

    document.documentElement.addEventListener(
      "mouseleave",
      handlePointerLeave,
    );

    document.documentElement.addEventListener(
      "mouseenter",
      handlePointerEnter,
    );

    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);

      window.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      document.documentElement.removeEventListener(
        "mouseleave",
        handlePointerLeave,
      );

      document.documentElement.removeEventListener(
        "mouseenter",
        handlePointerEnter,
      );
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="ambient-effects"
    >
      <div className="gold-powder-field">
        {goldPowder.map((style, index) => (
          <span
            key={index}
            className="gold-powder-grain"
            style={style}
          />
        ))}
      </div>

      <div
        ref={cursorGlowRef}
        className="cursor-glow"
      />

      <style jsx>{`
        .ambient-effects {
          position: absolute;
          inset: 0;
          z-index: 6;
          overflow: hidden;
          pointer-events: none;
        }

        .cursor-glow {
          position: fixed;
          top: 0;
          left: 0;
          width: min(38rem, 64vw);
          height: min(38rem, 64vw);
          border-radius: 9999px;
          opacity: 0;
          pointer-events: none;
          will-change: transform;
          transition: opacity 450ms ease;
          mix-blend-mode: screen;

          background:
            radial-gradient(
              circle at center,
              rgba(255, 237, 184, 0.2) 0%,
              rgba(217, 184, 101, 0.12) 17%,
              rgba(22, 132, 97, 0.09) 39%,
              rgba(5, 64, 44, 0.035) 58%,
              transparent 74%
            );

          filter: blur(12px);
        }

        .gold-powder-field {
          position: absolute;
          inset: 0;
          overflow: hidden;

          -webkit-mask-image:
            radial-gradient(
              ellipse at 50% 59%,
              rgba(0, 0, 0, 0.18) 0%,
              rgba(0, 0, 0, 0.52) 35%,
              black 72%
            );

          mask-image:
            radial-gradient(
              ellipse at 50% 59%,
              rgba(0, 0, 0, 0.18) 0%,
              rgba(0, 0, 0, 0.52) 35%,
              black 72%
            );
        }

        .gold-powder-grain {
          position: absolute;
          left: var(--left);
          top: var(--top);

          width: var(--width);
          height: var(--height);

          border-radius:
            58% 42% 67% 33% /
            38% 61% 39% 62%;

          opacity: var(--opacity);
          filter: blur(var(--blur));
          will-change: transform, opacity;

          background:
            linear-gradient(
              115deg,
              rgba(255, 244, 204, 0.95) 0%,
              rgba(239, 210, 134, 0.88) 33%,
              rgba(196, 143, 45, 0.76) 71%,
              rgba(255, 229, 153, 0.9) 100%
            );

          box-shadow:
            0 0 3px rgba(248, 218, 143, 0.55),
            0 0 8px rgba(207, 158, 57, 0.2);

          animation:
            powder-float
            var(--duration)
            ease-in-out
            var(--delay)
            infinite
            alternate;
        }

        .gold-powder-grain::after {
          content: "";
          position: absolute;
          left: -80%;
          top: 32%;

          width: 260%;
          height: 38%;

          border-radius: 999px;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(232, 194, 105, 0.24),
              rgba(255, 234, 174, 0.08),
              transparent
            );

          filter: blur(1.5px);
          opacity: 0.7;
        }

        @keyframes powder-float {
          0% {
            transform:
              translate3d(0, 0, 0)
              rotate(var(--rotation))
              scale(0.85);

            opacity: calc(var(--opacity) * 0.62);
          }

          45% {
            transform:
              translate3d(8px, -13px, 0)
              rotate(calc(var(--rotation) + 8deg))
              scale(1.08);

            opacity: var(--opacity);
          }

          100% {
            transform:
              translate3d(
                var(--drift-x),
                var(--drift-y),
                0
              )
              rotate(calc(var(--rotation) + 19deg))
              scale(0.92);

            opacity: calc(var(--opacity) * 0.74);
          }
        }

        @media (max-width: 768px) {
          .cursor-glow {
            display: none;
          }

          .gold-powder-grain:nth-child(2n) {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cursor-glow {
            display: none;
          }

          .gold-powder-grain {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}