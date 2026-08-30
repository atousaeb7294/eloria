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
      className="relative flex h-[3.35rem] w-[3.75rem] shrink-0 items-center justify-center sm:h-[4.35rem] sm:w-[5.1rem]"
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
        className="absolute inset-[1px] rounded-[1.2rem] border border-[#efd27c]/52 shadow-[0_0_28px_rgba(235,201,109,.22)]"
      />

      <span
        aria-hidden="true"
        className="absolute inset-[4px] rounded-[1rem] border border-[#f0d480]/32 bg-[radial-gradient(circle,rgba(247,219,136,0.22),rgba(2,39,27,0.25)_60%,transparent_80%)] shadow-[0_0_34px_rgba(229,194,101,0.22)]"
      />

      <motion.div
        className="relative z-10 h-[2.9rem] w-[3.35rem] sm:h-[3.85rem] sm:w-[4.5rem]"
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
          src="/images/brand/eloria-logo.webp"
          alt="Eloria"
          fill
          priority
          sizes="(max-width: 640px) 54px, 72px"
          className="object-contain mix-blend-screen brightness-[1.42] contrast-[1.38] saturate-[1.18] drop-shadow-[0_0_16px_rgba(255,222,133,0.78)]"
        />
      </motion.div>
    </motion.div>
  );
}
