"use client";

import Image from "next/image";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import type {
  ComponentType,
  MouseEvent,
} from "react";

import {
  BraceletRuneIcon,
  EarringRuneIcon,
  type LuxuryIconProps,
  MagicArrowIcon,
  NecklaceRuneIcon,
} from "@/components/luxury-icons";
import { Link } from "@/i18n/navigation";

export type CollectionCardItem = {
  slug:
    | "necklaces"
    | "bracelets"
    | "earrings";
  title: string;
  description: string;
  imageSrc: string;
  number: string;
};

type CollectionCardsProps = {
  items: CollectionCardItem[];
  enterLabel: string;
};

const iconMap: Record<
  CollectionCardItem["slug"],
  ComponentType<LuxuryIconProps>
> = {
  necklaces: NecklaceRuneIcon,
  bracelets: BraceletRuneIcon,
  earrings: EarringRuneIcon,
};

const particles = Array.from(
  { length: 24 },
  (_, index) => ({
    left: `${6 + ((index * 37) % 88)}%`,
    top: `${8 + ((index * 51) % 80)}%`,
    size: 2 + ((index * 5) % 4),
    delay: (index % 9) * 0.12,
    duration: 2.4 + (index % 7) * 0.32,
  }),
);

function CollectionCard({
  item,
  enterLabel,
  index,
}: {
  item: CollectionCardItem;
  enterLabel: string;
  index: number;
}) {
  const reducedMotion = useReducedMotion();

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  const rotateX = useSpring(rawRotateX, {
    stiffness: 160,
    damping: 19,
    mass: 0.6,
  });

  const rotateY = useSpring(rawRotateY, {
    stiffness: 160,
    damping: 19,
    mass: 0.6,
  });

  const movingGlow = useMotionTemplate`
    radial-gradient(
      circle at ${glowX}% ${glowY}%,
      rgba(255, 235, 176, 0.24),
      rgba(22, 132, 97, 0.1) 28%,
      transparent 56%
    )
  `;

  const Icon = iconMap[item.slug];

  const handleMouseMove = (
    event: MouseEvent<HTMLElement>,
  ) => {
    if (reducedMotion) {
      return;
    }

    const bounds =
      event.currentTarget.getBoundingClientRect();

    const x =
      (event.clientX - bounds.left) /
      bounds.width;

    const y =
      (event.clientY - bounds.top) /
      bounds.height;

    rawRotateY.set((x - 0.5) * 13);
    rawRotateX.set((0.5 - y) * 13);

    glowX.set(x * 100);
    glowY.set(y * 100);
  };

  const resetCard = () => {
    rawRotateX.set(0);
    rawRotateY.set(0);
    glowX.set(50);
    glowY.set(50);
  };

  return (
    <motion.article
      id={item.slug}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetCard}
      initial={{
        opacity: 0,
        y: 70,
        scale: 0.9,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      viewport={{
        once: true,
        amount: 0.18,
      }}
      whileHover={
        reducedMotion
          ? undefined
          : {
              y: -14,
              scale: 1.015,
            }
      }
      transition={{
        duration: 0.75,
        delay: index * 0.12,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        rotateX: reducedMotion
          ? 0
          : rotateX,
        rotateY: reducedMotion
          ? 0
          : rotateY,
        transformPerspective: 1350,
        transformStyle: "preserve-3d",
      }}
      className="group/card relative scroll-mt-36"
    >
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_center,rgba(218,181,87,0.2),rgba(22,132,97,0.08),transparent_70%)] opacity-40 blur-3xl transition duration-700 group-hover/card:opacity-100" />

      <div className="relative overflow-hidden rounded-[2.4rem] border border-[#e3c273]/35 bg-[linear-gradient(145deg,rgba(8,64,46,0.92),rgba(1,26,18,0.98))] p-px shadow-[0_30px_85px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] transition duration-700 group-hover/card:border-[#efd487]/70 group-hover/card:shadow-[0_42px_105px_rgba(0,0,0,0.6),0_0_40px_rgba(220,183,87,0.16),inset_0_1px_0_rgba(255,255,255,0.24)]">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30"
          style={{
            background: movingGlow,
          }}
        />

        <div className="relative overflow-hidden rounded-[calc(2.4rem-1px)] border border-white/[0.07] p-4 sm:p-5">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.065] [background-image:linear-gradient(30deg,transparent_24%,rgba(255,224,149,0.5)_25%,rgba(255,224,149,0.5)_26%,transparent_27%,transparent_74%,rgba(255,224,149,0.5)_75%,rgba(255,224,149,0.5)_76%,transparent_77%)] [background-size:42px_42px]"
          />

          <div
            className="relative z-40 mb-4 flex items-center justify-between"
            style={{
              transform: "translateZ(80px)",
            }}
          >
            <motion.span
              className="relative grid size-[60px] place-items-center rounded-2xl border border-[#e4c473]/40 bg-[radial-gradient(circle,rgba(246,220,151,0.22),rgba(20,116,84,0.26)_56%,rgba(2,37,26,0.9))] text-[#edcf7e] shadow-[inset_0_1px_0_rgba(255,255,255,0.23),0_14px_34px_rgba(0,0,0,0.32),0_0_20px_rgba(220,181,82,0.12)]"
              animate={
                reducedMotion
                  ? undefined
                  : {
                      y: [0, -5, 0],
                      rotateZ: [
                        -1.5,
                        1.5,
                        -1.5,
                      ],
                    }
              }
              transition={{
                duration: 4.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <motion.span
                aria-hidden="true"
                className="absolute inset-[5px] rounded-xl border border-dashed border-[#efd181]/30"
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

              <Icon className="relative z-10 size-8 transition duration-500 group-hover/card:scale-110 group-hover/card:drop-shadow-[0_0_10px_rgba(239,207,126,0.78)]" />
            </motion.span>

            <span className="text-[10px] tracking-[0.25em] text-[#d9bd78]/50">
              {item.number}
            </span>
          </div>

          <div
            className="relative z-20 aspect-[4/5] overflow-hidden rounded-[1.7rem] border border-[#e0bf6a]/30 bg-[#03271c] shadow-[0_20px_45px_rgba(0,0,0,0.4)]"
            style={{
              transform: "translateZ(55px)",
            }}
          >
            <Image
              src={item.imageSrc}
              alt={item.title}
              fill
              sizes="(max-width: 1024px) 92vw, 360px"
              className="object-cover transition duration-[1200ms] ease-out group-hover/card:scale-[1.1] group-hover/card:saturate-[1.15] group-hover/card:brightness-110"
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_26%,rgba(1,19,13,0.08)_48%,rgba(1,16,11,0.9)_100%)]" />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,231,164,0.17),transparent_44%)] opacity-60 transition duration-700 group-hover/card:opacity-100" />

            <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#f5df9f]/75 to-transparent" />

            <div className="pointer-events-none absolute inset-0">
              {particles.map(
                (particle, particleIndex) => (
                  <motion.span
                    key={particleIndex}
                    className="absolute rounded-full bg-[#f0cf7d] opacity-0 shadow-[0_0_8px_rgba(239,207,125,0.8)] transition-opacity duration-500 group-hover/card:opacity-75"
                    style={{
                      left: particle.left,
                      top: particle.top,
                      width: particle.size,
                      height: particle.size,
                    }}
                    animate={
                      reducedMotion
                        ? undefined
                        : {
                            y: [
                              10,
                              -18,
                              10,
                            ],
                            x: [
                              -3,
                              6,
                              -3,
                            ],
                            scale: [
                              0.65,
                              1.25,
                              0.65,
                            ],
                          }
                    }
                    transition={{
                      duration:
                        particle.duration,
                      delay: particle.delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ),
              )}
            </div>

            <span className="absolute -left-1/2 top-0 h-full w-1/3 skew-x-[-19deg] bg-gradient-to-r from-transparent via-white/[0.2] to-transparent blur-sm transition-all duration-1000 group-hover/card:left-[135%]" />
          </div>

          <div
            className="relative z-40 px-1 pb-1 pt-6"
            style={{
              transform: "translateZ(90px)",
            }}
          >
            <h2 className="text-3xl font-medium text-[#f8f0e2]">
              {item.title}
            </h2>

            <div className="mt-3 h-px w-16 bg-gradient-to-r from-[#e0bf6b] to-transparent transition-all duration-700 group-hover/card:w-28" />

            <p className="mt-4 min-h-20 text-sm leading-7 text-white/55 transition duration-500 group-hover/card:text-white/70">
              {item.description}
            </p>

            <Link
              href={`/collections/${item.slug}`}
              className="group/button relative mt-7 flex w-full items-center justify-between overflow-hidden rounded-[1.45rem] border border-[#e8c875]/50 bg-[linear-gradient(135deg,rgba(13,103,74,0.97),rgba(3,43,30,0.98)_54%,rgba(136,96,26,0.68))] p-2 pe-3 text-[#fff0bd] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_16px_40px_rgba(0,0,0,0.42),0_0_26px_rgba(216,182,106,0.12)] transition duration-500 hover:-translate-y-1 hover:border-[#f4d989]/90 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_22px_52px_rgba(0,0,0,0.5),0_0_40px_rgba(216,182,106,0.26)]"
            >
              <span className="absolute inset-[3px] rounded-[1.2rem] border border-white/10" />

              <span className="absolute -left-1/2 top-0 h-full w-1/3 skew-x-[-22deg] bg-gradient-to-r from-transparent via-white/[0.25] to-transparent blur-sm transition-all duration-700 group-hover/button:left-[125%]" />

              <span className="relative z-10 flex items-center gap-3">
                <span className="relative grid size-11 place-items-center rounded-xl border border-[#f0d487]/45 bg-[radial-gradient(circle,rgba(255,239,188,0.24),rgba(7,68,48,0.64))]">
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-1 rounded-lg border border-dashed border-[#efd27f]/30"
                    animate={
                      reducedMotion
                        ? undefined
                        : {
                            rotate: 360,
                          }
                    }
                    transition={{
                      duration: 14,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />

                  <Icon className="relative z-10 size-6 text-[#efd27f] transition duration-500 group-hover/button:scale-110 group-hover/button:drop-shadow-[0_0_8px_rgba(239,210,127,0.8)]" />
                </span>

                <span className="text-sm font-medium">
                  {enterLabel}
                </span>
              </span>

              <span className="relative z-10 grid size-10 place-items-center overflow-hidden rounded-full border border-[#efd27f]/30 bg-black/[0.14] transition duration-500 group-hover/button:scale-105 group-hover/button:bg-[#efd27f]/15">
                <motion.span
                  className="absolute inset-[4px] rounded-full border border-dashed border-[#efd27f]/24"
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          rotate: -360,
                        }
                  }
                  transition={{
                    duration: 16,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                <MagicArrowIcon className="relative z-10 size-5 transition-transform duration-500 group-hover/button:translate-x-1 rtl:rotate-180 rtl:group-hover/button:-translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function CollectionCards({
  items,
  enterLabel,
}: CollectionCardsProps) {
  return (
    <div className="mt-14 grid gap-8 lg:grid-cols-3">
      {items.map((item, index) => (
        <CollectionCard
          key={item.slug}
          item={item}
          enterLabel={enterLabel}
          index={index}
        />
      ))}
    </div>
  );
}