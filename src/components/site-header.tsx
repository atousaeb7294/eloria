"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import { useTranslations } from "next-intl";
import {
  type ComponentType,
  type FocusEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { FloatingLogo } from "@/components/floating-logo";
import {
  BraceletRuneIcon,
  ContactRuneIcon,
  EarringRuneIcon,
  HomeRuneIcon,
  type LuxuryIconProps,
  NecklaceRuneIcon,
  WorldRuneIcon,
} from "@/components/luxury-icons";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

type CollectionMenuItem = {
  label: string;
  href: string;
  icon: ComponentType<LuxuryIconProps>;
};

function MagicIconFrame({
  children,
  active = false,
  reverse = false,
}: {
  children: ReactNode;
  active?: boolean;
  reverse?: boolean;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <span
      className={[
        "relative grid size-9 shrink-0 place-items-center rounded-xl border transition duration-500",
        active
          ? "border-[#f1d487]/55 bg-[radial-gradient(circle,rgba(255,234,171,0.25),rgba(17,108,78,0.34)_58%,rgba(2,38,27,0.86))] text-[#f4da8d] shadow-[0_0_18px_rgba(229,195,110,0.18)]"
          : "border-[#e1c16f]/20 bg-[radial-gradient(circle,rgba(224,193,111,0.1),rgba(9,70,50,0.34)_60%,rgba(2,33,23,0.84))] text-white/65 group-hover:border-[#e7ca78]/45 group-hover:text-[#f1d486] group-hover:shadow-[0_0_20px_rgba(230,195,109,0.18)]",
      ].join(" ")}
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-[3px] rounded-[9px] border border-dashed border-[#efd184]/30"
        animate={
          reducedMotion
            ? undefined
            : {
                rotate: reverse ? -360 : 360,
              }
        }
        transition={{
          duration: 17,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <motion.span
        aria-hidden="true"
        className="absolute -right-1 -top-1 size-1.5 rounded-full bg-[#f8df96] shadow-[0_0_9px_#f8df96]"
        animate={
          reducedMotion
            ? undefined
            : {
                scale: [0.5, 1.3, 0.5],
                opacity: [0.3, 1, 0.3],
              }
        }
        transition={{
          duration: 2.3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <span className="relative z-10 transition duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_7px_rgba(239,207,127,0.72)]">
        {children}
      </span>
    </span>
  );
}

export function SiteHeader() {
  const t = useTranslations("Navigation");
  const reducedMotion = useReducedMotion();

  const [worldOpen, setWorldOpen] =
    useState(false);

  const closeTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const collectionItems: CollectionMenuItem[] = [
    {
      label: t("necklaces"),
      href: "/collections#necklaces",
      icon: NecklaceRuneIcon,
    },
    {
      label: t("bracelets"),
      href: "/collections#bracelets",
      icon: BraceletRuneIcon,
    },
    {
      label: t("earrings"),
      href: "/collections#earrings",
      icon: EarringRuneIcon,
    },
  ];

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openWorldMenu = () => {
    cancelScheduledClose();
    setWorldOpen(true);
  };

  const scheduleWorldClose = () => {
    cancelScheduledClose();

    closeTimerRef.current = setTimeout(() => {
      setWorldOpen(false);
    }, 140);
  };

  useEffect(() => {
    return () => {
      cancelScheduledClose();
    };
  }, []);

  const handleWorldBlur = (
    event: FocusEvent<HTMLDivElement>,
  ) => {
    const nextElement =
      event.relatedTarget as Node | null;

    if (
      !nextElement ||
      !event.currentTarget.contains(nextElement)
    ) {
      scheduleWorldClose();
    }
  };

  const normalButtonClass =
    "group relative inline-flex size-11 items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-500 hover:-translate-y-0.5 hover:border-[#dfbd68]/55 hover:bg-[#168461]/15 hover:text-[#f7dda0] lg:h-11 lg:w-auto lg:min-w-32 lg:px-3";

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-3 sm:top-6 sm:px-6">
      <div className="relative mx-auto max-w-6xl">
        <div
          aria-hidden="true"
          className="absolute -inset-4 -z-10 rounded-[2.8rem] bg-[radial-gradient(circle_at_center,rgba(216,182,106,0.14),rgba(17,110,79,0.1),transparent_72%)] blur-2xl"
        />

        <div className="rounded-[2rem] border border-[#e7ca7b]/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.24),rgba(211,174,83,0.13),rgba(13,92,65,0.16),rgba(255,255,255,0.05))] p-px shadow-[0_28px_80px_rgba(0,0,0,0.52),0_0_38px_rgba(214,182,106,0.12),inset_0_1px_0_rgba(255,255,255,0.45)]">
          <div className="relative flex min-h-20 items-center justify-between overflow-visible rounded-[31px] border border-white/10 bg-[linear-gradient(145deg,rgba(3,48,34,0.9),rgba(1,25,18,0.84))] px-3 py-2 backdrop-blur-2xl sm:px-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 left-1/4 h-28 w-72 rotate-[-12deg] bg-white/[0.07] blur-3xl"
            />

            <Link
              href="/collections"
              aria-label="Eloria"
              className="group relative z-10 flex shrink-0 items-center gap-1 sm:gap-3"
            >
              <FloatingLogo />

              <span className="hidden sm:block">
                <span className="block text-[15px] font-medium tracking-[0.34em] text-[#f7f0e4]">
                  ELORIA
                </span>

                <span className="mt-1 block text-[8px] tracking-[0.2em] text-[#d9bd78]/80">
                  {t("tagline")}
                </span>
              </span>
            </Link>

            <nav
              aria-label={t("menuLabel")}
              className="relative z-30 mx-1 flex items-center justify-center gap-1.5 sm:mx-2 sm:gap-2"
            >
              <Link
                href="/collections"
                title={t("home")}
                className="group relative inline-flex size-11 items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#f0d080]/60 bg-[linear-gradient(135deg,rgba(219,181,88,0.23),rgba(21,111,80,0.25))] text-[#ffe9af] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_24px_rgba(0,0,0,0.32),0_0_18px_rgba(218,179,86,0.12)] transition duration-500 hover:-translate-y-0.5 hover:border-[#f4d787]/80 lg:h-11 lg:w-auto lg:min-w-32 lg:px-3"
              >
                <span className="absolute inset-0 translate-y-full bg-gradient-to-t from-[#d5ad4d]/16 via-[#168461]/10 to-transparent transition-transform duration-500 group-hover:translate-y-0" />

                <span className="absolute -left-1/2 top-0 h-full w-1/3 skew-x-[-22deg] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent blur-sm transition-all duration-700 group-hover:left-[125%]" />

                <MagicIconFrame active>
                  <HomeRuneIcon className="size-[21px]" />
                </MagicIconFrame>

                <span className="relative z-10 hidden whitespace-nowrap text-xs font-medium lg:inline">
                  {t("home")}
                </span>
              </Link>

              <div
                className="relative"
                onMouseEnter={openWorldMenu}
                onMouseLeave={scheduleWorldClose}
                onFocusCapture={openWorldMenu}
                onBlurCapture={handleWorldBlur}
              >
                <button
                  type="button"
                  title={t("world")}
                  aria-expanded={worldOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    cancelScheduledClose();
                    setWorldOpen(
                      (current) => !current,
                    );
                  }}
                  className={normalButtonClass}
                >
                  <span className="absolute inset-0 translate-y-full bg-gradient-to-t from-[#d5ad4d]/16 via-[#168461]/10 to-transparent transition-transform duration-500 group-hover:translate-y-0" />

                  <span className="absolute -left-1/2 top-0 h-full w-1/3 skew-x-[-22deg] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent blur-sm transition-all duration-700 group-hover:left-[125%]" />

                  <MagicIconFrame reverse>
                    <WorldRuneIcon className="size-[22px]" />
                  </MagicIconFrame>

                  <span className="relative z-10 hidden whitespace-nowrap text-xs font-medium lg:inline">
                    {t("world")}
                  </span>

                  <motion.svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="relative z-10 hidden size-3.5 text-[#e6c879] lg:block"
                    animate={{
                      rotate: worldOpen ? 180 : 0,
                    }}
                    transition={{
                      duration: 0.3,
                    }}
                    aria-hidden="true"
                  >
                    <path
                      d="M4 7L10 13L16 7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </button>

                <AnimatePresence>
                  {worldOpen && (
                    <motion.div
                      role="menu"
                      initial={
                        reducedMotion
                          ? {
                              opacity: 0,
                            }
                          : {
                              opacity: 0,
                              y: -12,
                              scale: 0.9,
                              rotateX: -14,
                              filter: "blur(10px)",
                            }
                      }
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        rotateX: 0,
                        filter: "blur(0px)",
                      }}
                      exit={{
                        opacity: 0,
                        y: -9,
                        scale: 0.94,
                        rotateX: -8,
                        filter: "blur(7px)",
                      }}
                      transition={{
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="absolute left-1/2 top-full w-72 -translate-x-1/2 pt-3 [perspective:1000px]"
                    >
                      <div className="relative overflow-hidden rounded-[1.8rem] border border-[#e7ca78]/42 bg-[linear-gradient(145deg,rgba(4,61,43,0.99),rgba(1,24,17,0.99))] p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.65),0_0_36px_rgba(214,182,106,0.15),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl">
                        <div
                          aria-hidden="true"
                          className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f8e2a1]/85 to-transparent"
                        />

                        <div
                          aria-hidden="true"
                          className="absolute -right-16 -top-16 size-40 rounded-full bg-[#d6b45d]/10 blur-3xl"
                        />

                        <div
                          aria-hidden="true"
                          className="absolute -bottom-16 -left-16 size-40 rounded-full bg-[#168461]/15 blur-3xl"
                        />

                        <p className="relative z-10 px-3 pb-2 pt-2 text-[9px] font-medium tracking-[0.2em] text-[#d9bd78]/70">
                          {t("collectionMenu")}
                        </p>

                        <div className="relative z-10 space-y-1.5">
                          {collectionItems.map(
                            (item, index) => {
                              const Icon =
                                item.icon;

                              return (
                                <motion.div
                                  key={item.href}
                                  initial={{
                                    opacity: 0,
                                    x: 22,
                                    scale: 0.96,
                                  }}
                                  animate={{
                                    opacity: 1,
                                    x: 0,
                                    scale: 1,
                                  }}
                                  transition={{
                                    delay:
                                      index * 0.06,
                                    duration: 0.3,
                                  }}
                                >
                                  <Link
                                    role="menuitem"
                                    href={item.href}
                                    onClick={() =>
                                      setWorldOpen(
                                        false,
                                      )
                                    }
                                    className="group/item relative flex items-center gap-3 overflow-hidden rounded-2xl border border-transparent px-2.5 py-2.5 text-sm text-white/[0.72] transition duration-500 hover:-translate-y-0.5 hover:border-[#e0bf69]/35 hover:bg-[linear-gradient(135deg,rgba(214,180,88,0.13),rgba(22,132,97,0.19))] hover:text-[#ffe9ae]"
                                  >
                                    <span className="absolute -left-1/2 top-0 h-full w-1/3 skew-x-[-22deg] bg-gradient-to-r from-transparent via-white/[0.14] to-transparent blur-sm transition-all duration-700 group-hover/item:left-[125%]" />

                                    <span className="relative grid size-12 shrink-0 place-items-center rounded-xl border border-[#e1c16f]/32 bg-[radial-gradient(circle,rgba(239,211,136,0.2),rgba(15,97,69,0.3)_60%,rgba(2,35,25,0.86))] text-[#e8cb7c] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_20px_rgba(217,181,85,0.1)]">
                                      <motion.span
                                        aria-hidden="true"
                                        className="absolute inset-[4px] rounded-lg border border-dashed border-[#ebcd79]/28"
                                        animate={
                                          reducedMotion
                                            ? undefined
                                            : {
                                                rotate:
                                                  index %
                                                    2 ===
                                                  0
                                                    ? 360
                                                    : -360,
                                              }
                                        }
                                        transition={{
                                          duration:
                                            15 +
                                            index *
                                              2,
                                          repeat:
                                            Infinity,
                                          ease: "linear",
                                        }}
                                      />

                                      <motion.span
                                        className="relative z-10"
                                        animate={
                                          reducedMotion
                                            ? undefined
                                            : {
                                                y: [
                                                  0,
                                                  -2,
                                                  0,
                                                ],
                                              }
                                        }
                                        transition={{
                                          duration:
                                            3 +
                                            index *
                                              0.45,
                                          repeat:
                                            Infinity,
                                          ease: "easeInOut",
                                        }}
                                      >
                                        <Icon className="size-7 transition duration-500 group-hover/item:scale-110 group-hover/item:drop-shadow-[0_0_9px_rgba(239,207,124,0.75)]" />
                                      </motion.span>
                                    </span>

                                    <span className="relative z-10 font-medium">
                                      {item.label}
                                    </span>

                                    <span className="ms-auto size-1.5 rounded-full bg-[#d9bd78]/45 shadow-[0_0_8px_rgba(217,189,120,0.4)] transition duration-300 group-hover/item:scale-150 group-hover/item:bg-[#ffe49a]" />
                                  </Link>
                                </motion.div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                href="/#contact"
                title={t("contact")}
                className={normalButtonClass}
              >
                <span className="absolute inset-0 translate-y-full bg-gradient-to-t from-[#d5ad4d]/16 via-[#168461]/10 to-transparent transition-transform duration-500 group-hover:translate-y-0" />

                <span className="absolute -left-1/2 top-0 h-full w-1/3 skew-x-[-22deg] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent blur-sm transition-all duration-700 group-hover:left-[125%]" />

                <MagicIconFrame>
                  <ContactRuneIcon className="size-[21px]" />
                </MagicIconFrame>

                <span className="relative z-10 hidden whitespace-nowrap text-xs font-medium lg:inline">
                  {t("contact")}
                </span>
              </Link>
            </nav>

            <div className="relative z-10 shrink-0">
              <LocaleSwitcher />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}