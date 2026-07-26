"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { Link } from "@/i18n/navigation";

type HeroShowcaseProps = {
  tagline: string;
  enterWorld: string;
};

type BurstParticle = {
  x: number;
  y: number;
  size: number;
  width: number;
  rotate: number;
  delay: number;
  duration: number;
  opacity: number;
  blur: number;
};

type BurstStreak = {
  angle: number;
  width: number;
  thickness: number;
  delay: number;
  duration: number;
  opacity: number;
};

const burstParticles: BurstParticle[] = Array.from(
  { length: 96 },
  (_, index) => {
    const angle =
      (((index * 137.5 + (index % 9) * 7) % 360) *
        Math.PI) /
      180;

    const distance = 85 + ((index * 31) % 280);

    return {
      x:
        Math.cos(angle) *
        distance *
        (index % 4 === 0 ? 1.22 : 1),

      y: Math.sin(angle) * distance * 0.58,

      size: 2 + ((index * 17) % 7),

      width: 4 + ((index * 23) % 15),

      rotate: (index * 41) % 220,

      delay: 0.24 + (index % 16) * 0.026,

      duration: 1.15 + (index % 8) * 0.11,

      opacity: 0.34 + ((index * 13) % 55) / 100,

      blur:
        index % 8 === 0
          ? 1.4
          : index % 4 === 0
            ? 0.7
            : 0,
    };
  },
);

const burstStreaks: BurstStreak[] = Array.from(
  { length: 22 },
  (_, index) => ({
    angle: -165 + index * 15.5,

    width: 90 + ((index * 43) % 190),

    thickness: 2 + ((index * 7) % 8),

    delay: 0.18 + (index % 8) * 0.045,

    duration: 1.1 + (index % 6) * 0.13,

    opacity: 0.15 + ((index * 11) % 38) / 100,
  }),
);

function PortalIcon({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-[#efd58b]/50 bg-[radial-gradient(circle,rgba(255,237,180,0.28),rgba(13,91,65,0.36)_54%,rgba(2,34,24,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_0_24px_rgba(226,190,101,0.26)]">
      <motion.span
        aria-hidden="true"
        className="absolute inset-[5px] rounded-full border border-dashed border-[#f1d68b]/50"
        animate={
          reducedMotion
            ? undefined
            : {
                rotate: 360,
              }
        }
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <motion.svg
        viewBox="0 0 48 48"
        className="relative z-10 size-8 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="eloria-portal-gold"
            x1="7"
            y1="5"
            x2="41"
            y2="44"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFF5C8" />

            <stop
              offset="0.38"
              stopColor="#E8C872"
            />

            <stop
              offset="0.72"
              stopColor="#A97322"
            />

            <stop
              offset="1"
              stopColor="#F7DF95"
            />
          </linearGradient>

          <radialGradient
            id="eloria-portal-core"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(24 24) rotate(90) scale(11)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFFCE8" />

            <stop
              offset="0.26"
              stopColor="#F0D783"
            />

            <stop
              offset="0.65"
              stopColor="#168461"
            />

            <stop
              offset="1"
              stopColor="#073D2C"
            />
          </radialGradient>
        </defs>

        <motion.path
          d="M24 5L28.4 19.6L43 24L28.4 28.4L24 43L19.6 28.4L5 24L19.6 19.6L24 5Z"
          fill="url(#eloria-portal-gold)"
          style={{
            transformOrigin: "50% 50%",
          }}
          animate={
            reducedMotion
              ? undefined
              : {
                  rotate: [0, 45, 0],
                  scale: [0.82, 1.08, 0.82],
                  opacity: [0.62, 1, 0.62],
                }
          }
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.circle
          cx="24"
          cy="24"
          r="7.5"
          fill="url(#eloria-portal-core)"
          style={{
            transformOrigin: "50% 50%",
          }}
          animate={
            reducedMotion
              ? undefined
              : {
                  scale: [0.86, 1.16, 0.86],
                  opacity: [0.72, 1, 0.72],
                }
          }
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <circle
          cx="24"
          cy="24"
          r="13.5"
          fill="none"
          stroke="url(#eloria-portal-gold)"
          strokeWidth="0.9"
          opacity="0.7"
        />
      </motion.svg>

      <motion.span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(115deg,transparent_25%,rgba(255,255,255,0.26)_48%,transparent_70%)]"
        animate={
          reducedMotion
            ? undefined
            : {
                x: ["-130%", "130%"],
              }
        }
        transition={{
          duration: 2.8,
          repeat: Infinity,
          repeatDelay: 1.8,
          ease: "easeInOut",
        }}
      />
    </span>
  );
}

function GoldenPowderExplosion({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-[54%] z-0 h-1 w-1"
    >
      {/* رگه‌های موج انفجار */}
      {burstStreaks.map((streak, index) => (
        <motion.span
          key={`streak-${index}`}
          className="absolute left-0 top-0 block origin-left rounded-full"
          style={{
            width: streak.width,
            height: streak.thickness,
            rotate: `${streak.angle}deg`,

            background:
              "linear-gradient(90deg, rgba(255,245,205,0.78) 0%, rgba(232,195,103,0.48) 20%, rgba(192,137,39,0.18) 58%, transparent 100%)",

            filter: "blur(1.2px)",

            boxShadow:
              "0 0 10px rgba(225,185,91,0.18)",
          }}
          initial={
            reducedMotion
              ? {
                  opacity: streak.opacity * 0.3,
                  scaleX: 1,
                }
              : {
                  opacity: 0,
                  scaleX: 0,
                  x: 0,
                }
          }
          animate={
            reducedMotion
              ? undefined
              : {
                  opacity: [
                    0,
                    streak.opacity,
                    streak.opacity * 0.22,
                  ],

                  scaleX: [0, 1.18, 0.88],

                  x: [0, 15, 26],
                }
          }
          transition={{
            duration: streak.duration,
            delay: streak.delay,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}

      {/* ذرات پودر طلایی */}
      {burstParticles.map((particle, index) => (
        <motion.span
          key={`particle-${index}`}
          className="absolute left-0 top-0 block"
          style={{
            width: particle.width,
            height: particle.size,

            borderRadius:
              index % 3 === 0
                ? "72% 28% 61% 39% / 45% 62% 38% 55%"
                : "55% 45% 68% 32% / 42% 59% 41% 58%",

            filter: `blur(${particle.blur}px)`,

            background:
              index % 4 === 0
                ? "linear-gradient(105deg,#fff5c8,#e2b95b 48%,#9d671b)"
                : "linear-gradient(105deg,#f8e4a4,#c58d2d 62%,#f3ce79)",

            boxShadow:
              index % 6 === 0
                ? "0 0 8px rgba(255,224,145,0.75)"
                : "0 0 3px rgba(224,181,82,0.44)",
          }}
          initial={
            reducedMotion
              ? {
                  x: particle.x,
                  y: particle.y,
                  opacity: particle.opacity * 0.35,
                }
              : {
                  x: 0,
                  y: 0,
                  opacity: 0,
                  scale: 0,
                  rotate: 0,
                }
          }
          animate={
            reducedMotion
              ? undefined
              : {
                  x: [
                    0,
                    particle.x * 0.82,
                    particle.x,
                  ],

                  y: [
                    0,
                    particle.y * 0.82,
                    particle.y - 7,
                  ],

                  opacity: [
                    0,
                    particle.opacity,
                    particle.opacity * 0.24,
                  ],

                  scale: [0, 1.18, 0.72],

                  rotate: [
                    0,
                    particle.rotate,
                    particle.rotate + 18,
                  ],
                }
          }
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}

      {/* موج افقی انفجار پودر */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[130px] w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2"
        initial={{
          opacity: 0,
          scaleX: 0.18,
          scaleY: 0.3,
          filter: "blur(30px)",
        }}
        animate={{
          opacity: [0, 0.68, 0.16],
          scaleX: [0.18, 1.12, 1],
          scaleY: [0.3, 1, 0.82],

          filter: [
            "blur(30px)",
            "blur(8px)",
            "blur(17px)",
          ],
        }}
        transition={{
          duration: reducedMotion ? 0.2 : 1.7,
          delay: 0.18,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,235,174,0.4) 0%, rgba(222,178,75,0.25) 23%, rgba(177,119,28,0.1) 48%, transparent 73%)",

          WebkitMaskImage:
            "linear-gradient(90deg, transparent, black 14%, black 86%, transparent)",

          maskImage:
            "linear-gradient(90deg, transparent, black 14%, black 86%, transparent)",
        }}
      />
    </div>
  );
}

export function HeroShowcase({
  tagline,
  enterWorld,
}: HeroShowcaseProps) {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="world"
      className="relative z-20 flex min-h-[100svh] w-full flex-col items-center justify-end overflow-hidden px-3 pb-4 pt-28 sm:px-5 sm:pb-6 sm:pt-32"
    >
      {/* بخش تصاویر */}
      <div className="relative flex w-full max-w-[1120px] flex-col items-center justify-end">
        <GoldenPowderExplosion
          reducedMotion={reducedMotion}
        />

        {/* تصویر بالایی */}
        <motion.div
          className="relative z-20 flex w-full justify-center"
          initial={
            reducedMotion
              ? {
                  opacity: 0,
                }
              : {
                  opacity: 0,
                  y: 95,
                  scale: 0.48,
                  rotateX: 18,

                  filter:
                    "blur(28px) brightness(1.9) saturate(1.5)",
                }
          }
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,

            filter:
              "blur(0px) brightness(1) saturate(1)",
          }}
          transition={{
            duration: reducedMotion ? 0.35 : 1.55,
            delay: 0.18,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <motion.div
            className="relative flex w-full justify-center"
            animate={
              reducedMotion
                ? undefined
                : {
                    y: [0, -7, 0],
                    rotateZ: [-0.35, 0.35, -0.35],
                  }
            }
            transition={{
              duration: 5.8,
              delay: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Image
              src="/images/hero/eloria-top.png"
              alt=""
              width={1040}
              height={430}
              priority
              sizes="(max-width: 768px) 98vw, 920px"
              className="h-auto max-h-[32svh] w-auto max-w-[98vw] select-none object-contain drop-shadow-[0_26px_48px_rgba(0,0,0,0.64)] sm:max-h-[35svh] sm:max-w-[920px]"
            />
          </motion.div>
        </motion.div>

        {/* تصویر پایینی */}
        <motion.div
          className="relative z-30 -mt-5 flex w-full justify-center sm:-mt-8"
          initial={
            reducedMotion
              ? {
                  opacity: 0,
                }
              : {
                  opacity: 0,
                  y: 110,
                  scale: 0.82,
                  filter: "blur(18px)",
                }
          }
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
          }}
          transition={{
            duration: reducedMotion ? 0.35 : 1.35,
            delay: 0.58,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <motion.div
            className="relative flex w-full justify-center"
            animate={
              reducedMotion
                ? undefined
                : {
                    y: [0, -3, 0],
                    scale: [1, 1.008, 1],
                  }
            }
            transition={{
              duration: 5.1,
              delay: 1.9,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Image
              src="/images/hero/eloria-bottom.png"
              alt=""
              width={1160}
              height={460}
              priority
              sizes="(max-width: 768px) 100vw, 1060px"
              className="h-auto max-h-[34svh] w-auto max-w-[100vw] select-none object-contain drop-shadow-[0_30px_54px_rgba(0,0,0,0.74)] sm:max-h-[37svh] sm:max-w-[1060px]"
            />

            <motion.div
              aria-hidden="true"
              className="absolute bottom-[3%] left-1/2 -z-10 h-8 w-[62%] -translate-x-1/2 rounded-full bg-black/60 blur-2xl"
              animate={
                reducedMotion
                  ? undefined
                  : {
                      scaleX: [0.9, 1.05, 0.9],
                      opacity: [0.4, 0.62, 0.4],
                    }
              }
              transition={{
                duration: 5.1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* متن و دکمه */}
      <motion.div
        className="relative z-40 -mt-2 flex shrink-0 flex-col items-center text-center sm:-mt-3"
        initial={{
          opacity: 0,
          y: 24,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.9,
          delay: 1.25,
          ease: "easeOut",
        }}
      >
        <p className="mb-3 text-xs font-medium tracking-[0.16em] text-[#ecd89e] drop-shadow-[0_3px_12px_rgba(0,0,0,0.82)] sm:text-sm">
          {tagline}
        </p>

        <Link
          href="/collections"
          className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-[#ecd180]/60 bg-[linear-gradient(135deg,rgba(10,91,65,0.92),rgba(2,42,29,0.94)_54%,rgba(131,94,27,0.55))] py-2 pe-6 ps-2 text-sm font-medium text-[#fff0bd] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_15px_40px_rgba(0,0,0,0.46),0_0_30px_rgba(216,182,106,0.13)] backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-[#f7dc91]/90 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_21px_50px_rgba(0,0,0,0.52),0_0_38px_rgba(216,182,106,0.24)]"
        >
          <span className="absolute inset-[3px] rounded-full border border-white/10" />

          <span className="absolute -left-1/2 top-0 h-full w-1/3 skew-x-[-24deg] bg-gradient-to-r from-transparent via-white/24 to-transparent blur-sm transition-all duration-700 group-hover:left-[125%]" />

          <PortalIcon reducedMotion={reducedMotion} />

          <span className="relative z-10">
            {enterWorld}
          </span>

          <span className="relative z-10 size-1.5 rounded-full bg-[#f5d982] shadow-[0_0_10px_#f5d982] transition duration-500 group-hover:scale-150" />
        </Link>
      </motion.div>
    </section>
  );
}