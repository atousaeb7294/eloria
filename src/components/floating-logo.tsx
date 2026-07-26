"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

export function FloatingLogo() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative h-14 w-20 shrink-0 [perspective:900px] sm:h-16 sm:w-24">
      <motion.div
        className="absolute inset-0 grid place-items-center [transform-style:preserve-3d]"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                y: [-3, 5, -3],
                rotateX: [3, -3, 3],
                rotateY: [-7, 7, -7],
                rotateZ: [-1, 1, -1],
              }
        }
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        whileHover={
          shouldReduceMotion
            ? undefined
            : {
                scale: 1.08,
                rotateY: 12,
                rotateX: -5,
              }
        }
      >
        <Image
          src="/images/brand/eloria-logo.png"
          alt="Eloria"
          width={110}
          height={80}
          sizes="110px"
          className="h-full w-full object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)] [filter:drop-shadow(0_0_11px_rgba(230,197,113,0.38))]"
        />
      </motion.div>

      <motion.span
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-black/55 blur-md"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                scaleX: [1, 0.7, 1],
                opacity: [0.45, 0.22, 0.45],
              }
        }
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}