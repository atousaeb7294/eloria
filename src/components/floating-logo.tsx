"use client";

import Image from "next/image";
import {
  motion,
  useReducedMotion,
} from "motion/react";

export function FloatingLogo() {
  const reducedMotion =
    useReducedMotion();

  return (
    <motion.div
      className="relative flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16"
      animate={
        reducedMotion
          ? undefined
          : {
              y: [0, -3, 0],
            }
      }
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-dashed border-[#e5c675]/30"
        animate={
          reducedMotion
            ? undefined
            : {
                rotate: 360,
              }
        }
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <span
        aria-hidden="true"
        className="absolute inset-[5px] rounded-full border border-[#e4c46f]/20 bg-[radial-gradient(circle,rgba(222,188,91,0.13),rgba(2,39,27,0.2)_60%,transparent_75%)] shadow-[0_0_24px_rgba(220,187,92,0.1)]"
      />

      <motion.div
        className="relative z-10 h-11 w-11 sm:h-12 sm:w-12"
        whileHover={
          reducedMotion
            ? undefined
            : {
                scale: 1.08,
                rotate: 2,
              }
        }
        transition={{
          duration: 0.35,
        }}
      >
        <Image
          src="/images/brand/eloria-logo.png"
          alt="Eloria"
          fill
          priority
          sizes="48px"
          className="object-contain drop-shadow-[0_0_10px_rgba(230,197,111,0.28)]"
        />
      </motion.div>
    </motion.div>
  );
}