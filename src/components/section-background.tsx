"use client";

import Image from "next/image";

import {
  usePathname,
} from "next/navigation";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  useMemo,
} from "react";

import {
  usePageBackground,
} from "@/components/page-background-provider";

import {
  resolveSectionBackground,
} from "@/lib/section-backgrounds";

type BackgroundTone =
  | "none"
  | "soft"
  | "dark"
  | "deep";

type SectionBackgroundProps = {
  sectionKey: string;
  fixedIndex?: number;
  offset?: number;
  priority?: boolean;
  quality?: number;
  tone?: BackgroundTone;
  objectPosition?: string;
  className?: string;
  imageClassName?: string;
};

const toneClasses: Record<
  BackgroundTone,
  string
> = {
  none: "",

  soft:
    "bg-[linear-gradient(180deg,rgba(1,18,12,0.18),rgba(1,18,12,0.4))]",

  dark:
    "bg-[linear-gradient(180deg,rgba(1,17,11,0.4),rgba(1,14,9,0.72))]",

  deep:
    "bg-[linear-gradient(180deg,rgba(1,15,10,0.56),rgba(1,11,7,0.88))]",
};

export function SectionBackground({
  sectionKey,
  fixedIndex,
  offset = 0,
  priority = false,
  quality = 84,
  tone = "dark",
  objectPosition = "center",
  className = "",
  imageClassName = "",
}: SectionBackgroundProps) {
  const pathname =
    usePathname() ?? "/";

  const reducedMotion =
    useReducedMotion();

  const pageBackground =
    usePageBackground();

  const background =
    useMemo(() => {
      if (
        typeof fixedIndex ===
          "number" &&
        Number.isFinite(
          fixedIndex,
        )
      ) {
        return resolveSectionBackground({
          fixedIndex,
          offset,
        });
      }

      if (pageBackground) {
        return resolveSectionBackground({
          fixedIndex:
            pageBackground.index,
          offset,
        });
      }

      return resolveSectionBackground({
        seed:
          `${pathname}::${sectionKey}`,
        offset,
      });
    }, [
      fixedIndex,
      offset,
      pageBackground,
      pathname,
      sectionKey,
    ]);

  return (
    <div
      aria-hidden="true"
      data-background-index={
        background.index
      }
      data-background-ready={
        pageBackground
          ?.sessionReady
          ? "true"
          : "false"
      }
      className={[
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      ].join(" ")}
    >
      <AnimatePresence
        initial={false}
        mode="sync"
      >
        <motion.div
          key={background.src}
          className="absolute inset-0"
          initial={
            reducedMotion
              ? false
              : {
                  opacity: 0,
                  scale: 1.025,
                }
          }
          animate={{
            opacity: 1,
            scale: 1,
          }}
          exit={
            reducedMotion
              ? undefined
              : {
                  opacity: 0,
                  scale: 1.012,
                }
          }
          transition={{
            opacity: {
              duration:
                reducedMotion
                  ? 0
                  : 0.85,

              ease:
                "easeInOut",
            },

            scale: {
              duration:
                reducedMotion
                  ? 0
                  : 1.25,

              ease: [
                0.16,
                1,
                0.3,
                1,
              ],
            },
          }}
        >
          <Image
            fill
            src={background.src}
            alt=""
            priority={priority}
            quality={quality}
            sizes="100vw"
            draggable={false}
            className={[
              "select-none object-cover",
              imageClassName,
            ].join(" ")}
            style={{
              objectPosition,
            }}
          />

          {tone !== "none" && (
            <div
              className={[
                "absolute inset-0",
                toneClasses[
                  tone
                ],
              ].join(" ")}
            />
          )}

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(229,194,103,0.1),transparent_38%),linear-gradient(110deg,rgba(2,45,31,0.24),transparent_42%,rgba(166,116,26,0.08))]" />

          <div className="absolute inset-0 shadow-[inset_0_0_160px_35px_rgba(0,0,0,0.52)]" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}