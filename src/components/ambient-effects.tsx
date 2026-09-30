"use client";

import type { CSSProperties } from "react";

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
const goldPowder: PowderStyle[] = Array.from({ length: 18 }, (_, index) => {
  const left = (index * 47 + (index % 7) * 11) % 100;
  const top = (index * 67 + (index % 5) * 13) % 100;
  const width = 1.5 + ((index * 17) % 7);
  const height = 0.8 + ((index * 11) % 4);
  const opacity = 0.13 + ((index * 19) % 38) / 100;
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
  return (
    <div aria-hidden="true" className="ambient-effects">
      <div className="gold-powder-field">
        {goldPowder.map((style, index) => (
          <span key={index} className="gold-powder-grain" style={style} />
        ))}
      </div>


      <style jsx>{`
        .ambient-effects {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          height: 100svh;
          z-index: 6;
          overflow: hidden;
          pointer-events: none;
          contain: layout paint style;
        }

        .gold-powder-field {
          position: absolute;
          inset: 0;
          overflow: hidden;
          -webkit-mask-image: radial-gradient(
            ellipse at 50% 59%,
            rgba(0, 0, 0, 0.18) 0%,
            rgba(0, 0, 0, 0.52) 35%,
            black 72%
          );
          mask-image: radial-gradient(
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
          background: linear-gradient(
            115deg,
            rgba(255, 244, 204, 0.95) 0%,
            rgba(239, 210, 134, 0.88) 33%,
            rgba(196, 143, 45, 0.76) 71%,
            rgba(255, 229, 153, 0.9) 100%
          );
          box-shadow:
            0 0 3px rgba(248, 218, 143, 0.55),
            0 0 8px rgba(207, 158, 57, 0.2);
          animation: powder-float var(--duration) ease-in-out var(--delay)
            infinite alternate;
        }

        @keyframes powder-float {
          0% {
            transform: translate3d(0, 0, 0) rotate(var(--rotation)) scale(0.86);
            opacity: calc(var(--opacity) * 0.64);
          }

          48% {
            transform: translate3d(7px, -12px, 0)
              rotate(calc(var(--rotation) + 7deg)) scale(1.06);
            opacity: var(--opacity);
          }

          100% {
            transform: translate3d(var(--drift-x), var(--drift-y), 0)
              rotate(calc(var(--rotation) + 15deg)) scale(0.96);
            opacity: calc(var(--opacity) * 0.78);
          }
        }

        @media (max-width: 768px), (update: slow) {
          .gold-powder-grain:nth-child(2n) {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gold-powder-grain {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
