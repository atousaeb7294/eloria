"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  type ComponentType,
  type FocusEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CartHeaderButton,
} from "@/components/cart-header-button";

import {
  FloatingLogo,
} from "@/components/floating-logo";

import {
  BraceletRuneIcon,
  ContactRuneIcon,
  EarringRuneIcon,
  HomeRuneIcon,
  type LuxuryIconProps,
  NecklaceRuneIcon,
  WorldRuneIcon,
} from "@/components/luxury-icons";

import {
  LocaleSwitcher,
} from "@/components/locale-switcher";

import {
  MobileSiteMenu,
} from "@/components/mobile-site-menu";

import {
  GoldRuneIcon,
  SilverRuneIcon,
} from "@/components/material-rune-icons";

type CollectionMenuItem = {
  label: string;
  slug: string;

  icon:
    ComponentType<LuxuryIconProps>;
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
  const reducedMotion =
    useReducedMotion();

  return (
    <span
      className={[
        "relative grid size-8 shrink-0 place-items-center rounded-[10px] border transition duration-500 sm:size-9 sm:rounded-xl",
        active
          ? "border-[#f1d487]/55 bg-[radial-gradient(circle,rgba(255,234,171,0.25),rgba(17,108,78,0.34)_58%,rgba(2,38,27,0.86))] text-[#f4da8d] shadow-[0_0_18px_rgba(229,195,110,0.18)]"
          : "border-[#e1c16f]/20 bg-[radial-gradient(circle,rgba(224,193,111,0.1),rgba(9,70,50,0.34)_60%,rgba(2,33,23,0.84))] text-white/65 group-hover:border-[#e7ca78]/45 group-hover:text-[#f1d486] group-hover:shadow-[0_0_20px_rgba(230,195,109,0.16)]",
      ].join(" ")}
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-[3px] rounded-[9px] border border-dashed border-[#efd184]/30"
        animate={
          reducedMotion
            ? undefined
            : {
                rotate:
                  reverse
                    ? -360
                    : 360,
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
                scale: [
                  0.55,
                  1.25,
                  0.55,
                ],

                opacity: [
                  0.35,
                  1,
                  0.35,
                ],
              }
        }
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <span className="relative z-10 transition duration-500 group-hover:scale-110">
        {children}
      </span>
    </span>
  );
}

type SiteHeaderProps = {
  locale?: string;
};

const NAVIGATION_LABELS = {
  fa: {
    tagline: "جواهری از دل افسانه",
    menuLabel: "منوی اصلی",
    home: "خانه",
    world: "دنیای الوریا",
    necklaces: "گردنبندها",
    bracelets: "دستبندها",
    earrings: "گوشواره‌ها",
    contact: "تماس",
  },
  en: {
    tagline: "A jewel born from legend",
    menuLabel: "Main navigation",
    home: "Home",
    world: "Eloria World",
    necklaces: "Necklaces",
    bracelets: "Bracelets",
    earrings: "Earrings",
    contact: "Contact",
  },
} as const;

export function SiteHeader({
  locale,
}: SiteHeaderProps) {
  const pathname =
    usePathname() ?? "/";

  const pathnameLocale =
    pathname.match(
      /^\/(fa|en)(?=\/|$)/,
    )?.[1];

  const resolvedLocale =
    locale === "en" ||
    locale === "fa"
      ? locale
      : pathnameLocale === "en"
        ? "en"
        : "fa";

  const labels =
    NAVIGATION_LABELS[resolvedLocale];

  const reducedMotion =
    useReducedMotion();

  const isPersian =
    resolvedLocale === "fa";

  const [
    worldOpen,
    setWorldOpen,
  ] = useState(false);

  const closeTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const homeHref =
    `/${resolvedLocale}#hero`;

  const collectionsHref =
    `/${resolvedLocale}/collections`;

  const isHomeActive =
    pathname === `/${resolvedLocale}` ||
    pathname === `/${resolvedLocale}/`;

  const isWorldActive =
    pathname.startsWith(`/${resolvedLocale}/collections`) ||
    pathname.startsWith(`/${resolvedLocale}/products`);

  const collectionItems:
    CollectionMenuItem[] = [
      {
        label:
          labels.necklaces,

        slug:
          "necklaces",

        icon:
          NecklaceRuneIcon,
      },

      {
        label:
          labels.bracelets,

        slug:
          "bracelets",

        icon:
          BraceletRuneIcon,
      },

      {
        label:
          labels.earrings,

        slug:
          "earrings",

        icon:
          EarringRuneIcon,
      },
    ];

  const cancelScheduledClose =
    () => {
      if (
        closeTimerRef.current
      ) {
        clearTimeout(
          closeTimerRef.current,
        );

        closeTimerRef.current =
          null;
      }
    };

  const openWorldMenu =
    () => {
      cancelScheduledClose();

      setWorldOpen(true);
    };

  const scheduleWorldClose =
    () => {
      cancelScheduledClose();

      closeTimerRef.current =
        setTimeout(() => {
          setWorldOpen(false);
        }, 170);
    };

  useEffect(() => {
    return () => {
      if (
        closeTimerRef.current
      ) {
        clearTimeout(
          closeTimerRef.current,
        );
      }
    };
  }, []);

  const handleWorldBlur = (
    event:
      FocusEvent<HTMLDivElement>,
  ) => {
    const nextElement =
      event.relatedTarget as
        | Node
        | null;

    if (
      !nextElement ||
      !event.currentTarget.contains(
        nextElement,
      )
    ) {
      scheduleWorldClose();
    }
  };

  const normalButtonClass =
    "group relative inline-flex size-10 items-center justify-center gap-2 overflow-hidden rounded-xl sm:size-11 sm:rounded-2xl border border-white/10 bg-white/[0.045] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-500 hover:-translate-y-0.5 hover:border-[#dfbd68]/55 hover:bg-[#168461]/15 hover:text-[#f7dda0] lg:h-11 lg:w-auto lg:min-w-28 lg:px-3";

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-6 sm:px-6">
      <a
        href="#main-content"
        className="fixed start-4 top-2 z-[120] -translate-y-20 rounded-full border border-[#efd27c]/50 bg-[#062c20] px-4 py-2 text-xs text-[#f3d990] shadow-xl transition focus:translate-y-0"
      >
        {isPersian
          ? "رفتن به محتوای اصلی"
          : "Skip to main content"}
      </a>
      <div className="relative mx-auto max-w-7xl">
        <div
          aria-hidden="true"
          className="absolute -inset-4 -z-10 rounded-[2.8rem] bg-[radial-gradient(circle_at_center,rgba(216,182,106,0.14),rgba(17,110,79,0.1),transparent_72%)] blur-2xl"
        />

        <div className="rounded-[2rem] border border-[#e7ca7b]/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.24),rgba(211,174,83,0.13),rgba(13,92,65,0.16),rgba(255,255,255,0.05))] p-px shadow-[0_28px_80px_rgba(0,0,0,0.52),0_0_38px_rgba(214,182,106,0.12)]">
          <div className="relative flex min-h-16 items-center justify-between overflow-visible rounded-[25px] border border-white/10 bg-[linear-gradient(145deg,rgba(3,48,34,0.92),rgba(1,25,18,0.88))] px-2 py-1.5 backdrop-blur-2xl sm:min-h-20 sm:rounded-[31px] sm:px-5 sm:py-2">
            <div
              aria-hidden="true"
              className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
            />

            <Link
              href={
                homeHref
              }
              aria-label={
                isPersian
                  ? "صفحه اصلی الوریا"
                  : "Eloria home"
              }
              className="relative z-10 flex shrink-0 items-center gap-1 sm:gap-3"
            >
              <FloatingLogo />

              <span className="hidden sm:block">
                <span className="font-eloria-brand block text-[15px] text-[#f7f0e4]">
                  ELORIA
                </span>

                <span className="mt-1 block text-[10px] tracking-[0.18em] text-[#e2c77f]/90">
                  {labels.tagline}
                </span>
              </span>
            </Link>

            <nav
              aria-label={
                labels.menuLabel
              }
              className="relative z-30 mx-2 hidden items-center justify-center gap-2 md:flex"
            >
              <Link
                href={
                  homeHref
                }
                title={
                  labels.home
                }
                aria-label={
                  isPersian
                    ? "رفتن به صفحه اصلی"
                    : "Go to home page"
                }
                aria-current={isHomeActive ? "page" : undefined}
                className={[
                  "group relative inline-flex size-10 items-center justify-center gap-2 overflow-hidden rounded-xl border transition duration-500 hover:-translate-y-0.5 sm:size-11 sm:rounded-2xl lg:h-11 lg:w-auto lg:min-w-28 lg:px-3",
                  isHomeActive
                    ? "border-[#f0d080]/60 bg-[linear-gradient(135deg,rgba(219,181,88,0.23),rgba(21,111,80,0.25))] text-[#ffe9af] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_24px_rgba(0,0,0,0.32),0_0_18px_rgba(218,179,86,0.12)] hover:border-[#f4d787]/80"
                    : "border-white/10 bg-white/[0.045] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-[#dfbd68]/55 hover:bg-[#168461]/15 hover:text-[#f7dda0]",
                ].join(" ")}
              >
                <span className="absolute inset-0 translate-y-full bg-gradient-to-t from-[#d5ad4d]/16 via-[#168461]/10 to-transparent transition-transform duration-500 group-hover:translate-y-0" />

                <MagicIconFrame
                  active={isHomeActive}
                >
                  <HomeRuneIcon className="size-[21px]" />
                </MagicIconFrame>

                <span className="relative z-10 hidden whitespace-nowrap text-xs font-medium lg:inline">
                  {labels.home}
                </span>
              </Link>

              <div
                className="relative"
                onMouseEnter={
                  openWorldMenu
                }
                onMouseLeave={
                  scheduleWorldClose
                }
                onFocusCapture={
                  openWorldMenu
                }
                onBlurCapture={
                  handleWorldBlur
                }
              >
                <div className={[
                    "group relative flex h-10 items-center overflow-hidden rounded-xl border transition duration-500 hover:-translate-y-0.5 sm:h-11 sm:rounded-2xl",
                    isWorldActive
                      ? "border-[#f0d080]/48 bg-[linear-gradient(135deg,rgba(219,181,88,0.15),rgba(21,111,80,0.2))] text-[#f8dfa0]"
                      : "border-white/10 bg-white/[0.045] text-white/70 hover:border-[#dfbd68]/55 hover:bg-[#168461]/15 hover:text-[#f7dda0]",
                  ].join(" ")}>
                  <Link
                    href={
                      collectionsHref
                    }
                    title={
                      labels.world
                    }
                    aria-haspopup="menu"
                    aria-expanded={
                      worldOpen
                    }
                    className="flex h-full items-center gap-2 px-1.5 lg:min-w-24 lg:px-3"
                  >
                    <MagicIconFrame
                      active={isWorldActive}
                      reverse
                    >
                      <WorldRuneIcon className="size-[22px]" />
                    </MagicIconFrame>

                    <span className="hidden whitespace-nowrap text-xs font-medium lg:inline">
                      {labels.world}
                    </span>
                  </Link>

                  <button
                    type="button"
                    aria-label={
                      isPersian
                        ? "نمایش منوی گنجینه‌ها"
                        : "Open collections menu"
                    }
                    onClick={() => {
                      cancelScheduledClose();

                      setWorldOpen(
                        (
                          current,
                        ) =>
                          !current,
                      );
                    }}
                    className="flex h-full w-7 items-center justify-center border-s border-white/[0.08] text-[#d9bd78]/70 transition hover:bg-white/[0.04] hover:text-[#f0d586]"
                  >
                    <motion.svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className="size-3.5"
                      animate={{
                        rotate:
                          worldOpen
                            ? 180
                            : 0,
                      }}
                      transition={{
                        duration:
                          0.25,
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
                </div>

                <AnimatePresence>
                  {worldOpen && (
                    <motion.div
                      role="menu"
                      initial={
                        reducedMotion
                          ? {
                              opacity:
                                0,
                            }
                          : {
                              opacity:
                                0,

                              y: -12,

                              scale:
                                0.92,
                            }
                      }
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        y: -8,
                        scale: 0.95,
                      }}
                      transition={{
                        duration:
                          0.28,
                      }}
                      className="absolute left-1/2 top-full w-[min(94vw,430px)] -translate-x-1/2 pt-3 max-sm:fixed max-sm:left-1/2 max-sm:top-24"
                    >
                      <div className="relative overflow-hidden rounded-[1.8rem] border border-[#e7ca78]/42 bg-[linear-gradient(145deg,rgba(4,61,43,0.99),rgba(1,24,17,0.99))] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.65),0_0_36px_rgba(214,182,106,0.15)] backdrop-blur-2xl">
                        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f8e2a1]/85 to-transparent" />

                        <Link
                          href={
                            collectionsHref
                          }
                          onClick={() =>
                            setWorldOpen(
                              false,
                            )
                          }
                          className="relative mb-3 flex items-center justify-between rounded-2xl border border-[#e1c16f]/25 bg-[#d4b258]/[0.06] px-4 py-3 text-xs text-[#ead698] transition hover:border-[#e4c873]/48 hover:bg-[#d4b258]/[0.09]"
                        >
                          <span>
                            {isPersian
                              ? "هر قطعه، روایتی ماندگار"
                              : "Every Piece, an Enduring Story"}
                          </span>

                          <WorldRuneIcon className="h-5 w-5" />
                        </Link>

                        <div className="space-y-2">
                          {collectionItems.map(
                            (
                              item,
                              index,
                            ) => {
                              const Icon =
                                item.icon;

                              return (
                                <motion.div
                                  key={
                                    item.slug
                                  }
                                  initial={{
                                    opacity:
                                      0,

                                    x: 18,
                                  }}
                                  animate={{
                                    opacity:
                                      1,

                                    x: 0,
                                  }}
                                  transition={{
                                    delay:
                                      index *
                                      0.05,

                                    duration:
                                      0.25,
                                  }}
                                  className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-2.5"
                                >
                                  <div className="flex items-center gap-3 px-1 pb-2">
                                    <span className="grid size-10 place-items-center rounded-xl border border-[#e1c16f]/25 bg-[#d4b258]/[0.055] text-[#e8cb7c]">
                                      <Icon className="size-6" />
                                    </span>

                                    <Link
                                      href={`${collectionsHref}#${item.slug}`}
                                      onClick={() =>
                                        setWorldOpen(
                                          false,
                                        )
                                      }
                                      className="text-sm font-medium text-white/75 transition hover:text-[#f1d790]"
                                    >
                                      {
                                        item.label
                                      }
                                    </Link>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <Link
                                      href={`/${resolvedLocale}/collections/${item.slug}/gold`}
                                      onClick={() =>
                                        setWorldOpen(
                                          false,
                                        )
                                      }
                                      className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d9b85f]/30 bg-[#d4b258]/[0.07] px-2 text-[10px] text-[#efd995] transition hover:border-[#efd17a]/58 hover:bg-[#d4b258]/[0.11]"
                                    >
                                      <GoldRuneIcon className="h-4 w-4" />

                                      <span>
                                        {isPersian
                                          ? "طلا"
                                          : "Gold"}
                                      </span>
                                    </Link>

                                    <Link
                                      href={`/${resolvedLocale}/collections/${item.slug}/silver`}
                                      onClick={() =>
                                        setWorldOpen(
                                          false,
                                        )
                                      }
                                      className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d8e2e5]/22 bg-[#dce6e9]/[0.045] px-2 text-[10px] text-[#dfe8ea] transition hover:border-[#dfe8eb]/42 hover:bg-[#dce6e9]/[0.075]"
                                    >
                                      <SilverRuneIcon className="h-4 w-4" />

                                      <span>
                                        {isPersian
                                          ? "نقره"
                                          : "Silver"}
                                      </span>
                                    </Link>
                                  </div>
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
                href="#contact"
                title={
                  labels.contact
                }
                className={
                  normalButtonClass
                }
              >
                <MagicIconFrame>
                  <ContactRuneIcon className="size-[21px]" />
                </MagicIconFrame>

                <span className="relative z-10 hidden whitespace-nowrap text-xs font-medium lg:inline">
                  {labels.contact}
                </span>
              </Link>
            </nav>

            <div className="relative z-10 flex shrink-0 items-center gap-1.5 sm:gap-2">
              <CartHeaderButton
                locale={resolvedLocale}
                variant="compact"
              />

              <div className="hidden sm:block">
                <LocaleSwitcher locale={resolvedLocale} />
              </div>

              <MobileSiteMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}