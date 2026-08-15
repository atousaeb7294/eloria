"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  BookOpenText,
  Menu,
  UserRound,
  X,
} from "lucide-react";

import {
  BraceletRuneIcon,
  ContactRuneIcon,
  EarringRuneIcon,
  HomeRuneIcon,
  NecklaceRuneIcon,
  WorldRuneIcon,
} from "@/components/luxury-icons";

import {
  LocaleSwitcher,
} from "@/components/locale-switcher";

export function MobileSiteMenu() {
  const pathname =
    usePathname() ?? "/fa";

  const locale =
    pathname.match(
      /^\/(fa|en)(?=\/|$)/,
    )?.[1] === "en"
      ? "en"
      : "fa";

  const labels =
    locale === "fa"
      ? {
          home: "خانه",
          world: "دنیای الوریا",
          necklaces: "گردنبندها",
          bracelets: "دستبندها",
          earrings: "گوشواره‌ها",
          contact: "تماس",
          menuLabel: "منوی اصلی",
        }
      : {
          home: "Home",
          world: "Eloria World",
          necklaces: "Necklaces",
          bracelets: "Bracelets",
          earrings: "Earrings",
          contact: "Contact",
          menuLabel: "Main navigation",
        };

  const reducedMotion =
    useReducedMotion();

  const isPersian =
    locale === "fa";

  const [
    open,
    setOpen,
  ] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleEscape =
      (event: KeyboardEvent) => {
        if (
          event.key ===
          "Escape"
        ) {
          setOpen(false);
        }
      };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [open]);

  const closeMenu =
    () => {
      setOpen(false);
    };

  const homeHref =
    `/${locale}#hero`;

  const collectionsHref =
    `/${locale}/collections`;

  const productsHref =
    `/${locale}/products`;

  const aboutHref =
    `/${locale}/about`;

  const contactHref =
    `/${locale}#contact`;

  const profileHref =
    `/${locale}/profile`;

  const isHomeActive =
    pathname === `/${locale}` ||
    pathname === `/${locale}/`;

  const isCollectionsActive =
    pathname.startsWith(
      `/${locale}/collections`,
    );

  const isProductsActive =
    pathname.startsWith(
      `/${locale}/products`,
    );

  const isAboutActive =
    pathname.startsWith(
      `/${locale}/about`,
    );

  const isProfileActive =
    pathname.startsWith(
      `/${locale}/profile`,
    ) || pathname.startsWith(`/${locale}/login`);

  const primaryLinks = [
    {
      label: labels.home,
      description:
        isPersian
          ? "بازگشت مستقیم به Hero"
          : "Return directly to the Hero",
      href: homeHref,
      active: isHomeActive,
      icon: HomeRuneIcon,
    },
    {
      label: labels.world,
      description:
        isPersian
          ? "مرور دسته‌بندی‌های جواهرات"
          : "Browse jewelry categories",
      href: collectionsHref,
      active: isCollectionsActive,
      icon: WorldRuneIcon,
    },
    {
      label:
        isPersian
          ? "تمام آثار"
          : "All creations",
      description:
        isPersian
          ? "مشاهده آرشیو کامل آثار الوریا"
          : "View the complete Eloria archive",
      href: productsHref,
      active: isProductsActive,
      icon: NecklaceRuneIcon,
    },
    {
      label:
        isPersian
          ? "داستان الوریا"
          : "The Eloria story",
      description:
        isPersian
          ? "آشنایی با هویت و ریشه برند"
          : "Discover the identity behind the brand",
      href: aboutHref,
      active: isAboutActive,
      icon: BookOpenText,
    },
    {
      label: isPersian ? "حساب من" : "My account",
      description: isPersian ? "سفارش‌ها، آدرس‌ها و علاقه‌مندی‌ها" : "Orders, addresses and favorites",
      href: profileHref,
      active: isProfileActive,
      icon: UserRound,
    },
  ];

  const categories = [
    {
      label: labels.necklaces,
      slug: "necklaces",
      icon: NecklaceRuneIcon,
    },
    {
      label: labels.bracelets,
      slug: "bracelets",
      icon: BraceletRuneIcon,
    },
    {
      label: labels.earrings,
      slug: "earrings",
      icon: EarringRuneIcon,
    },
  ];

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={
          open
            ? isPersian
              ? "بستن منوی اصلی"
              : "Close main menu"
            : isPersian
              ? "بازکردن منوی اصلی"
              : "Open main menu"
        }
        aria-expanded={open}
        aria-controls="eloria-mobile-navigation"
        onClick={() => {
          setOpen(
            (current) =>
              !current,
          );
        }}
        className="relative grid size-10 place-items-center overflow-hidden rounded-xl border border-[#e1c16f]/22 bg-white/[0.045] text-[#efd58c] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-[#e8c96f]/52 hover:bg-[#168461]/14 sm:size-11 sm:rounded-2xl"
      >
        <span
          aria-hidden="true"
          className="absolute inset-[3px] rounded-[9px] border border-dashed border-[#efd184]/20"
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={
              open
                ? "close"
                : "menu"
            }
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    rotate: -40,
                    scale: 0.7,
                  }
            }
            animate={{
              opacity: 1,
              rotate: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              rotate: 40,
              scale: 0.7,
            }}
            transition={{
              duration: 0.2,
            }}
            className="relative z-10"
          >
            {open ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </motion.span>
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
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
              onClick={closeMenu}
              className="fixed inset-0 z-[70] cursor-default bg-black/58 backdrop-blur-[7px]"
            />

            <motion.aside
              id="eloria-mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-label={
                isPersian
                  ? "منوی اصلی الوریا"
                  : "Eloria main menu"
              }
              dir={
                isPersian
                  ? "rtl"
                  : "ltr"
              }
              initial={
                reducedMotion
                  ? {
                      opacity: 0,
                    }
                  : {
                      opacity: 0,
                      y: -18,
                      scale: 0.96,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -14,
                scale: 0.97,
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
              className="fixed inset-x-3 top-[82px] z-[80] max-h-[calc(100dvh-96px)] overflow-y-auto overscroll-contain rounded-[1.8rem] border border-[#e4c570]/38 bg-[linear-gradient(155deg,rgba(4,58,41,0.995),rgba(1,24,17,0.995)_55%,rgba(1,13,9,0.998))] p-3 shadow-[0_34px_110px_rgba(0,0,0,0.76),0_0_46px_rgba(216,177,74,0.12)] sm:inset-x-5 sm:top-[96px]"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#ffe39c]/80 to-transparent"
              />

              <div className="relative overflow-hidden rounded-[1.3rem] border border-[#e0c16e]/16 bg-white/[0.025] px-4 py-4">
                <p className="font-eloria-brand text-[15px] text-[#f4ead7]">
                  ELORIA
                </p>
                <p className="mt-2 text-[11px] leading-6 text-white/52">
                  {isPersian
                    ? "مسیر سریع میان خانه، گنجینه‌ها و تمام آثار الوریا"
                    : "Quick access to home, collections and all Eloria creations"}
                </p>
              </div>

              <nav
                aria-label={labels.menuLabel}
                className="mt-3 space-y-1.5"
              >
                {primaryLinks.map(
                  (
                    item,
                    index,
                  ) => {
                    const Icon =
                      item.icon;

                    return (
                      <motion.div
                        key={item.href}
                        initial={
                          reducedMotion
                            ? false
                            : {
                                opacity: 0,
                                x: isPersian
                                  ? 12
                                  : -12,
                              }
                        }
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay:
                            index *
                            0.045,
                        }}
                      >
                        <Link
                          href={item.href}
                          onClick={closeMenu}
                          aria-current={
                            item.active
                              ? "page"
                              : undefined
                          }
                          className={[
                            "group flex min-h-[66px] items-center gap-3 rounded-[1.1rem] border px-3.5 transition duration-300",
                            item.active
                              ? "border-[#e4c46e]/38 bg-[#d6af4d]/[0.085]"
                              : "border-transparent bg-white/[0.015] hover:border-[#d9bb68]/22 hover:bg-[#d5ad50]/[0.045]",
                          ].join(" ")}
                        >
                          <span className="grid size-11 shrink-0 place-items-center rounded-[13px] border border-[#d8b85f]/20 bg-[#0c6648]/18 text-[#e2c777] transition group-hover:border-[#e0c16d]/40 group-hover:text-[#f1d78e]">
                            <Icon className="size-6" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium text-white/84">
                              {item.label}
                            </span>
                            <span className="mt-1.5 block text-[10px] leading-5 text-white/46">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      </motion.div>
                    );
                  },
                )}
              </nav>

              <div className="mt-3 rounded-[1.2rem] border border-[#dfc16c]/15 bg-black/12 p-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#e5ca80]/58">
                    {isPersian
                      ? "دسته‌بندی‌ها"
                      : "Categories"}
                  </p>
                  <WorldRuneIcon className="size-4 text-[#e1c573]/55" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {categories.map(
                    (category) => {
                      const Icon =
                        category.icon;

                      return (
                        <Link
                          key={category.slug}
                          href={`/${locale}/collections/${category.slug}`}
                          onClick={closeMenu}
                          className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-[0.95rem] border border-white/[0.07] bg-white/[0.025] px-2 text-center text-[10px] text-white/62 transition hover:border-[#dfc16f]/30 hover:bg-[#d6af4d]/[0.055] hover:text-[#f0d891]"
                        >
                          <Icon className="size-6" />
                          <span>
                            {category.label}
                          </span>
                        </Link>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <Link
                  href={contactHref}
                  onClick={closeMenu}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#dfc16f]/30 bg-[#d7b14f]/[0.065] px-5 text-xs text-[#efd68e] transition hover:border-[#efd27c]/58 hover:bg-[#d7b14f]/[0.1]"
                >
                  <ContactRuneIcon className="size-5" />
                  {labels.contact}
                </Link>

                <div className="rounded-full border border-white/[0.07] bg-black/10 px-2 py-1">
                  <LocaleSwitcher locale={locale} />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
