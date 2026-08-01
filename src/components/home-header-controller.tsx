"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  useEffect,
  useState,
} from "react";

import {
  CartHeaderButton,
} from "@/components/cart-header-button";
import {
  FloatingLogo,
} from "@/components/floating-logo";
import {
  LocaleSwitcher,
} from "@/components/locale-switcher";
import {
  SiteHeader,
} from "@/components/site-header";

type HomeHeaderControllerProps = {
  locale: string;
};

type NavigationItem = {
  label: string;
  description: string;
  href: string;
  icon: "collections" | "products" | "story" | "contact";
};

function NavigationIcon({
  type,
  className,
}: {
  type: NavigationItem["icon"];
  className?: string;
}) {
  if (type === "collections") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <path d="M5 7.5L12 4L19 7.5V16.5L12 20L5 16.5V7.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M5.5 7.7L12 11L18.5 7.7M12 11V19.5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" opacity="0.72" />
        <path d="M9 6L15 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      </svg>
    );
  }

  if (type === "products") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <path d="M12 3L14.2 9.8L21 12L14.2 14.2L12 21L9.8 14.2L3 12L9.8 9.8L12 3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      </svg>
    );
  }

  if (type === "story") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <path
          d="M5 5.6C7.55 4.55 9.75 4.95 12 6.55V19C9.75 17.4 7.55 17 5 18.05V5.6Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M19 5.6C16.45 4.55 14.25 4.95 12 6.55V19C14.25 17.4 16.45 17 19 18.05V5.6Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M7.8 8.4C9.05 8.1 10.05 8.3 11 8.9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <path d="M16.2 8.4C14.95 8.1 13.95 8.3 13 8.9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M5 6.5H19V17.5H5V6.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.5 7L12 12.5L18.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 15.1L10.15 13.3M16 15.1L13.85 13.3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function HomeHeaderController({
  locale,
}: HomeHeaderControllerProps) {
  const reducedMotion =
    useReducedMotion();

  const isPersian =
    locale === "fa";

  const [
    fullHeaderVisible,
    setFullHeaderVisible,
  ] = useState(false);

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const navigationItems: NavigationItem[] =
    isPersian
      ? [
          {
            label: "داستان الوریا",
            description: "آشنایی با هویت، ریشه‌ها و روایت برند",
            href: `/${locale}/about`,
            icon: "story",
          },
          {
            label: "تماس با ما",
            description: "ارتباط مستقیم با همراهان الوریا",
            href: "#contact",
            icon: "contact",
          },
        ]
      : [
          {
            label: "The Eloria Story",
            description: "Discover the identity and origins of Eloria",
            href: `/${locale}/about`,
            icon: "story",
          },
          {
            label: "Contact Us",
            description: "Connect directly with Eloria",
            href: "#contact",
            icon: "contact",
          },
        ];

  useEffect(() => {
    let animationFrameId =
      0;

    const updateHeaderMode =
      () => {
        animationFrameId =
          0;

        const threshold =
          Math.max(
            420,
            window.innerHeight *
              0.7,
          );

        const shouldShowFullHeader =
          window.scrollY >=
          threshold;

        setFullHeaderVisible(
          (current) =>
            current ===
            shouldShowFullHeader
              ? current
              : shouldShowFullHeader,
        );

        if (
          shouldShowFullHeader
        ) {
          setMenuOpen(
            false,
          );
        }
      };

    const scheduleHeaderUpdate =
      () => {
        if (
          animationFrameId !==
          0
        ) {
          return;
        }

        animationFrameId =
          window.requestAnimationFrame(
            updateHeaderMode,
          );
      };

    const initialFrameId =
      window.requestAnimationFrame(
        updateHeaderMode,
      );

    window.addEventListener(
      "scroll",
      scheduleHeaderUpdate,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "resize",
      scheduleHeaderUpdate,
    );

    return () => {
      window.cancelAnimationFrame(
        initialFrameId,
      );

      if (
        animationFrameId !==
        0
      ) {
        window.cancelAnimationFrame(
          animationFrameId,
        );
      }

      window.removeEventListener(
        "scroll",
        scheduleHeaderUpdate,
      );

      window.removeEventListener(
        "resize",
        scheduleHeaderUpdate,
      );
    };
  }, []);

  useEffect(() => {
    const handleEscape =
      (
        event: KeyboardEvent,
      ) => {
        if (
          event.key ===
          "Escape"
        ) {
          setMenuOpen(
            false,
          );
        }
      };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  const closeMenu =
    () => {
      setMenuOpen(
        false,
      );
    };

  const toggleMenu =
    () => {
      setMenuOpen(
        (current) =>
          !current,
      );
    };

  return (
    <>
      {/* هدر مینیمال روی Hero */}
      <AnimatePresence>
        {!fullHeaderVisible && (
          <motion.header
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: -16,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -14,
            }}
            transition={{
              duration: 0.42,
              ease: [
                0.16,
                1,
                0.3,
                1,
              ],
            }}
            dir={
              isPersian
                ? "rtl"
                : "ltr"
            }
            className="fixed inset-x-0 top-0 z-[70] px-4 pt-4 sm:px-6 sm:pt-5"
          >
            <div className="relative mx-auto flex h-[62px] max-w-[1180px] items-center justify-between rounded-[18px] border border-[#d9ba67]/24 bg-[linear-gradient(135deg,rgba(2,29,20,0.84),rgba(1,17,12,0.72))] px-2 shadow-[0_18px_60px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl sm:h-[68px] sm:px-2.5">
              {/* نور ظریف بالای هدر */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#efd48c]/52 to-transparent"
              />

              {/* دکمه منو */}
              <button
                type="button"
                aria-label={
                  isPersian
                    ? "باز کردن منو"
                    : "Open navigation"
                }
                aria-expanded={
                  menuOpen
                }
                aria-controls="eloria-home-menu"
                onClick={
                  toggleMenu
                }
                className="group relative grid size-11 shrink-0 place-items-center rounded-[13px] border border-[#dabe6e]/28 bg-[linear-gradient(145deg,rgba(8,65,46,0.5),rgba(2,29,20,0.72))] text-[#e9d493] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_8px_24px_rgba(0,0,0,0.2)] transition duration-300 hover:-translate-y-0.5 hover:border-[#edd387]/64 hover:bg-[linear-gradient(145deg,rgba(13,91,64,0.58),rgba(2,38,26,0.78))] hover:text-[#ffe8aa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3c675]/55 sm:size-12"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-1.5 top-1.5 size-1.5 border-l border-t border-[#e9cd80]/42"
                />

                <span
                  aria-hidden="true"
                  className="absolute bottom-1.5 right-1.5 size-1.5 border-b border-r border-[#e9cd80]/42"
                />

                <span className="relative flex w-[19px] flex-col gap-[5px]">
                  <span
                    className={[
                      "h-px origin-center bg-current transition duration-300",
                      menuOpen
                        ? "translate-y-[6px] rotate-45"
                        : "",
                    ].join(" ")}
                  />

                  <span
                    className={[
                      "h-px bg-current transition duration-300",
                      menuOpen
                        ? "scale-x-0 opacity-0"
                        : "",
                    ].join(" ")}
                  />

                  <span
                    className={[
                      "h-px origin-center bg-current transition duration-300",
                      menuOpen
                        ? "-translate-y-[6px] -rotate-45"
                        : "",
                    ].join(" ")}
                  />
                </span>
              </button>

              {/* برند مرکزی */}
              <Link
                href={`/${locale}`}
                aria-label={
                  isPersian
                    ? "صفحه اصلی الوریا"
                    : "Eloria home"
                }
                onClick={
                  closeMenu
                }
                className="group absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-3"
              >
                {/* لوگوی شناور بدون مربع یا قاب */}
                <motion.span
                  aria-hidden="true"
                  className="relative flex size-12 shrink-0 items-center justify-center sm:size-[56px]"
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          y: [
                            0,
                            -3,
                            0,
                          ],
                          rotate: [
                            0,
                            0.8,
                            0,
                            -0.8,
                            0,
                          ],
                        }
                  }
                  transition={{
                    y: {
                      duration: 3.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                    rotate: {
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                >
                  {/* فقط هاله نرم؛ بدون چهارچوب */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e2bd65]/10 blur-xl transition duration-500 group-hover:bg-[#efd487]/18 sm:size-12"
                  />

                  <span className="relative flex size-full items-center justify-center drop-shadow-[0_0_10px_rgba(233,201,116,0.22)] transition duration-500 group-hover:scale-[1.04] group-hover:drop-shadow-[0_0_16px_rgba(239,207,126,0.35)] [&_img]:h-full [&_img]:w-full [&_img]:object-contain [&_svg]:h-full [&_svg]:w-full">
                    <FloatingLogo />
                  </span>
                </motion.span>

                {/* جداکننده */}
                <span
                  aria-hidden="true"
                  className="hidden h-8 w-px bg-gradient-to-b from-transparent via-[#d9ba68]/30 to-transparent sm:block"
                />

                {/* نام برند */}
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="font-eloria-brand block whitespace-nowrap text-[13px] text-[#f8f1e2] transition duration-300 group-hover:text-[#fff5dc]">
                    ELORIA
                  </span>

                  <span className="mt-1.5 block whitespace-nowrap text-[8px] tracking-[0.14em] text-[#dcc37d]/70 transition duration-300 group-hover:text-[#e3c778]/72">
                    JEWELS OF LEGEND
                  </span>
                </span>
              </Link>

              {/* سبد خرید */}
              <CartHeaderButton
                locale={
                  locale
                }
                variant="compact"
              />
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* پنجره منو */}
      <AnimatePresence>
        {menuOpen &&
          !fullHeaderVisible && (
            <>
              <motion.button
                type="button"
                aria-label={
                  isPersian
                    ? "بستن منو"
                    : "Close menu"
                }
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                onClick={
                  closeMenu
                }
                className="fixed inset-0 z-[65] cursor-default bg-black/38 backdrop-blur-[3px]"
              />

              <motion.div
                id="eloria-home-menu"
                dir={
                  isPersian
                    ? "rtl"
                    : "ltr"
                }
                initial={{
                  opacity: 0,
                  y: -12,
                  scale: 0.97,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                  scale: 0.98,
                }}
                transition={{
                  duration: 0.3,
                  ease: [
                    0.16,
                    1,
                    0.3,
                    1,
                  ],
                }}
                className="fixed start-4 top-[84px] z-[80] w-[min(330px,calc(100vw-32px))] sm:start-6 sm:top-[98px]"
              >
                <div className="relative overflow-hidden rounded-[24px] border border-[#dabe68]/32 bg-[linear-gradient(150deg,rgba(4,54,38,0.985),rgba(1,26,18,0.99)_56%,rgba(1,14,10,0.995))] p-3 shadow-[0_34px_110px_rgba(0,0,0,0.72),0_0_42px_rgba(216,177,74,0.1)] backdrop-blur-3xl">
                  {/* خط طلایی بالا */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#ffe29a]/76 to-transparent"
                  />

                  {/* هاله تزئینی */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -end-20 -top-24 size-52 rounded-full bg-[#d8ae4c]/[0.075] blur-[55px]"
                  />

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-24 -start-20 size-48 rounded-full bg-[#0a805a]/[0.07] blur-[52px]"
                  />

                  {/* عنوان پنجره */}
                  <div className="relative mb-3 flex items-center justify-between rounded-[17px] border border-[#e0c06d]/14 bg-white/[0.022] px-4 py-3.5">
                    <div>
                      <p className="text-[11px] font-medium text-[#f3dfaa]">
                        {isPersian
                          ? "جهان الوریا"
                          : "The World of Eloria"}
                      </p>

                      <p className="mt-1.5 text-[10px] leading-5 tracking-[0.02em] text-white/52">
                        {isPersian
                          ? "داستان برند و راه‌های ارتباطی"
                          : "Brand story and contact information"}
                      </p>
                    </div>

                    <motion.span
                      aria-hidden="true"
                      className="relative grid size-9 place-items-center"
                      animate={
                        reducedMotion
                          ? undefined
                          : {
                              rotate: [
                                0,
                                45,
                                0,
                              ],
                            }
                      }
                      transition={{
                        duration: 7,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <span className="size-3 rotate-45 border border-[#efd482]/58" />

                      <span className="absolute size-1 rotate-45 bg-[#f3d889] shadow-[0_0_8px_rgba(243,216,137,0.6)]" />
                    </motion.span>
                  </div>

                  {/* گزینه‌های منو */}
                  <nav
                    aria-label={
                      isPersian
                        ? "منوی اصلی"
                        : "Main navigation"
                    }
                    className="relative space-y-1.5"
                  >
                    {navigationItems.map(
                      (
                        item,
                        index,
                      ) => (
                        <motion.div
                          key={
                            item.href
                          }
                          initial={{
                            opacity: 0,
                            x: isPersian
                              ? 10
                              : -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay:
                              index *
                              0.06,
                          }}
                        >
                          <Link
                            href={
                              item.href
                            }
                            onClick={
                              closeMenu
                            }
                            className="group relative flex min-h-[66px] items-center gap-3 overflow-hidden rounded-[17px] border border-transparent px-3 transition duration-300 hover:border-[#d9bb68]/22 hover:bg-[#d5ad50]/[0.05] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d9bb68]/45"
                          >
                            {/* آیکون */}
                            <span className="grid size-11 shrink-0 place-items-center rounded-[13px] border border-[#d8b85f]/18 bg-[#0c6648]/18 text-[#d7bd78]/64 transition duration-300 group-hover:border-[#e0c16d]/40 group-hover:bg-[#b99038]/[0.06] group-hover:text-[#f1d78e]">
                              <NavigationIcon
                                type={
                                  item.icon
                                }
                                className="size-5"
                              />
                            </span>

                            {/* متن */}
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-medium text-white/82 transition duration-300 group-hover:text-[#f5dda0]">
                                {item.label}
                              </span>

                              <span className="mt-1.5 block truncate text-[10px] text-white/48 transition duration-300 group-hover:text-white/48">
                                {
                                  item.description
                                }
                              </span>
                            </span>

                            {/* فلش */}
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                              className={[
                                "size-4 shrink-0 text-[#d4b664]/40 transition duration-300 group-hover:text-[#efd486]",
                                isPersian
                                  ? "rotate-180 group-hover:-translate-x-1"
                                  : "group-hover:translate-x-1",
                              ].join(" ")}
                            >
                              <path
                                d="M5 12H19M13 6L19 12L13 18"
                                stroke="currentColor"
                                strokeWidth="1.35"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>

                            <span className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d9bb68]/18 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                          </Link>
                        </motion.div>
                      ),
                    )}
                  </nav>

                  {/* انتخاب زبان */}
                  <div className="relative mt-3 rounded-[16px] border border-[#dcc06c]/14 bg-black/10 p-2.5">
                    <LocaleSwitcher />
                  </div>
                </div>
              </motion.div>
            </>
          )}
      </AnimatePresence>

      {/* هدر کامل پس از عبور از Hero */}
      <AnimatePresence>
        {fullHeaderVisible && (
          <motion.div
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: -14,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -12,
            }}
            transition={{
              duration: 0.4,
              ease: [
                0.16,
                1,
                0.3,
                1,
              ],
            }}
            className="relative z-50"
          >
            <SiteHeader />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}