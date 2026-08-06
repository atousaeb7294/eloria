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

// جلوه ذرات حفظ شده، اما تعداد آن برای روان‌ترشدن رابط کاهش یافته است.
const goldPowder: PowderStyle[] = Array.from({ length: 58 }, (_, index) => {
  const left = (index * 47 + (index % 7) * 11) % 100;
  const top = (index * 67 + (index % 5) * 13) % 100;
  const width = 1.5 + ((index * 17) % 7);
  const height = 0.8 + ((index * 11) % 4);
  const opacity = 0.13 + (((index * 19) % 38) / 100);
  const duration = 11 + ((index * 13) % 16);
  const delay = -((index * 7) % 18);
  const rotation = (index * 29) % 180;
  const driftX = -27 + ((index * 23) % 72);
  const driftY = -44 + ((index * 31) % 58);
  const blur = index % 6 === 0 ? "0.9px" : index % 4 === 0 ? "0.35px" : "0px";

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
});

export function AmbientEffects() {
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const cursorGlow = cursorGlowRef.current;
    if (!cursorGlow) return;

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!finePointer.matches || reducedMotion.matches) {
      cursorGlow.style.display = "none";
      return;
    }

    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;
    targetRef.current = { x: startX, y: startY };
    currentRef.current = { x: startX, y: startY };

    const paint = () => {
      const target = targetRef.current;
      const current = currentRef.current;
      const dx = target.x - current.x;
      const dy = target.y - current.y;

      current.x += dx * 0.16;
      current.y += dy * 0.16;

      cursorGlow.style.transform =
        `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;

      if (Math.abs(dx) > 0.35 || Math.abs(dy) > 0.35) {
        frameRef.current = window.requestAnimationFrame(paint);
      } else {
        current.x = target.x;
        current.y = target.y;
        cursorGlow.style.transform =
          `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;
        frameRef.current = null;
      }
    };

    const requestPaint = () => {
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(paint);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetRef.current = { x: event.clientX, y: event.clientY };
      cursorGlow.style.opacity = "1";
      requestPaint();
    };

    const handlePointerLeave = () => {
      cursorGlow.style.opacity = "0";
    };

    const handlePointerEnter = () => {
      cursorGlow.style.opacity = "1";
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", handlePointerLeave);
    document.documentElement.addEventListener("mouseenter", handlePointerEnter);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("mouseleave", handlePointerLeave);
      document.documentElement.removeEventListener("mouseenter", handlePointerEnter);
    };
  }, []);

  return (
    <div aria-hidden="true" className="ambient-effects">
      <div className="gold-powder-field">
        {goldPowder.map((style, index) => (
          <span key={index} className="gold-powder-grain" style={style} />
        ))}
      </div>

      <div ref={cursorGlowRef} className="cursor-glow" />

      <style jsx>{`
        .ambient-effects {
          position: absolute;
          inset: 0;
          z-index: 6;
          overflow: hidden;
          pointer-events: none;
          contain: layout paint style;
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
          will-change: transform, opacity;
          transition: opacity 360ms ease;
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
          border-radius: 58% 42% 67% 33% / 38% 61% 39% 62%;
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

        @keyframes powder-float {
          0% {
            transform:
              translate3d(0, 0, 0)
              rotate(var(--rotation))
              scale(0.86);
            opacity: calc(var(--opacity) * 0.64);
          }

          48% {
            transform:
              translate3d(7px, -12px, 0)
              rotate(calc(var(--rotation) + 7deg))
              scale(1.06);
            opacity: var(--opacity);
          }

          100% {
            transform:
              translate3d(var(--drift-x), var(--drift-y), 0)
              rotate(calc(var(--rotation) + 15deg))
              scale(0.96);
            opacity: calc(var(--opacity) * 0.78);
          }
        }

        @media (max-width: 768px), (update: slow) {
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
