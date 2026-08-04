"use client";

import Link from "next/link";
import {
  motion,
  useReducedMotion,
} from "motion/react";

import {
  SectionBackground,
} from "@/components/section-background";

type HeroShowcaseProps = {
  locale: string;
  persianTitleClassName?: string;
};

type HeroCopy = {
  eyebrow: string;
  titleFirst: string;
  titleHighlight: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
  welcome: string;
};

export function HeroShowcase({
  locale,
  persianTitleClassName,
}: HeroShowcaseProps) {
  const reducedMotion =
    useReducedMotion();

  const isPersian =
    locale === "fa";

  const copy: HeroCopy =
    isPersian
      ? {
          eyebrow:
            "الهام‌گرفته از شکوه ایران کهن",

          titleFirst:
            "هر قطعه،",

          titleHighlight:
            "روایتی ماندگار",

          description:
            "آثاری برای آنان که می‌خواهند بخشی از یک افسانه را با خود همراه کنند.",

          primaryAction:
            "کشف جهان الوریا",

          secondaryAction:
            "تماشای آثار",

          welcome:
            "به جهان الوریا خوش آمدید",
        }
      : {
          eyebrow:
            "Inspired by the Splendour of Ancient Persia",

          titleFirst:
            "Every Piece,",

          titleHighlight:
            "an Enduring Story",

          description:
            "Creations for those who wish to carry a fragment of legend with them.",

          primaryAction:
            "Discover Eloria",

          secondaryAction:
            "Explore the Creations",

          welcome:
            "Welcome to the World of Eloria",
        };

  const titleFontClass =
    isPersian
      ? persianTitleClassName ??
        ""
      : "font-serif";

  return (
    <section
      id="hero"
      aria-labelledby="eloria-hero-title"
      dir={
        isPersian
          ? "rtl"
          : "ltr"
      }
      className="relative min-h-[100svh] scroll-mt-0 overflow-hidden bg-[#02140e] p-2.5 text-[#f8f0df] sm:p-5"
    >
      <div className="relative isolate flex min-h-[calc(100svh-20px)] w-full items-center justify-center overflow-hidden rounded-[1.65rem] border border-[#dec06d]/24 bg-[#02140e] shadow-[0_34px_110px_rgba(0,0,0,0.7),0_0_55px_rgba(216,180,88,0.08)] sm:min-h-[calc(100svh-40px)] sm:rounded-[2.4rem]">
        <SectionBackground
          sectionKey="home-hero"
          priority
          tone="none"
          quality={92}
          objectPosition="center 46%"
          imageClassName="scale-[1.02]"
        />

        {/* پوشش تصویر */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(1,11,7,0.22)_0%,rgba(1,20,13,0.08)_32%,rgba(1,16,10,0.4)_70%,rgba(1,9,6,0.9)_100%)]"
        />

        {/* تیرگی کناره‌ها */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_13%,rgba(1,19,12,0.13)_47%,rgba(0,7,4,0.82)_100%)]"
        />

        {/* نور طلایی مرکزی */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[43%] z-[4] size-[45rem] max-h-[86vw] max-w-[86vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,230,161,0.17),rgba(208,164,61,0.065)_35%,rgba(16,105,75,0.055)_58%,transparent_74%)] blur-[42px]"
          animate={
            reducedMotion
              ? undefined
              : {
                  opacity: [
                    0.48,
                    0.88,
                    0.48,
                  ],
                  scale: [
                    0.95,
                    1.07,
                    0.95,
                  ],
                }
          }
          transition={{
            duration: 6.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* نور عمودی */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 z-[4] w-[34rem] max-w-[76vw] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(248,219,145,0.045),rgba(255,235,181,0.085),rgba(248,219,145,0.045),transparent)] blur-[46px]"
        />

        {/* بافت هندسی */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] opacity-[0.035] [background-image:linear-gradient(rgba(238,205,118,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(238,205,118,0.5)_1px,transparent_1px)] [background-size:84px_84px] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]"
        />

        {/* خط طلایی بالا */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-12 top-0 z-[8] h-px bg-gradient-to-r from-transparent via-[#ffe6a1]/74 to-transparent"
        />

        {/* تزئین گوشه بالا */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute end-7 top-7 z-[8] hidden size-28 opacity-40 sm:block"
        >
          <span className="absolute end-0 top-0 h-px w-full bg-gradient-to-s from-[#f1d486]/72 to-transparent" />

          <span className="absolute end-0 top-0 h-full w-px bg-gradient-to-b from-[#f1d486]/72 to-transparent" />

          <span className="absolute end-2 top-2 size-2 rotate-45 border border-[#f5db91]/65" />
        </div>

        {/* تزئین گوشه پایین */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-7 start-7 z-[8] hidden size-28 rotate-180 opacity-30 sm:block"
        >
          <span className="absolute end-0 top-0 h-px w-full bg-gradient-to-s from-[#f1d486]/68 to-transparent" />

          <span className="absolute end-0 top-0 h-full w-px bg-gradient-to-b from-[#f1d486]/68 to-transparent" />

          <span className="absolute end-2 top-2 size-2 rotate-45 border border-[#f5db91]/58" />
        </div>

        {/* محتوای اصلی؛ کمی بالاتر از مرکز */}
        <div className="relative z-20 mx-auto flex w-full max-w-6xl -translate-y-[1.5vh] flex-col items-center justify-center px-5 pb-24 pt-28 text-center sm:-translate-y-[5vh] sm:px-10 sm:pb-20 sm:pt-24">
          {/* عنوان کوچک */}
          <motion.div
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: 14,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.1,
              duration: 0.75,
            }}
            className="mb-3 flex max-w-full items-center justify-center gap-3 sm:gap-4"
          >
            <span className="h-px w-8 bg-gradient-to-l from-[#e8c875]/70 to-transparent sm:w-12" />

            <p className="max-w-[15rem] text-[10px] font-medium leading-5 tracking-[0.06em] text-[#efd487]/88 sm:max-w-none sm:text-xs sm:tracking-[0.08em]">
              {copy.eyebrow}
            </p>

            <span className="h-px w-8 bg-gradient-to-r from-[#e8c875]/70 to-transparent sm:w-12" />
          </motion.div>

          {/* تیتر نستعلیق */}
          <motion.h1
            id="eloria-hero-title"
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: 26,
                    filter:
                      "blur(9px)",
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
              filter:
                "blur(0px)",
            }}
            transition={{
              delay: 0.2,
              duration: 1.05,
              ease: [
                0.16,
                1,
                0.3,
                1,
              ],
            }}
            className={[
              titleFontClass,
              "max-w-5xl pb-2 text-center text-[clamp(2.25rem,11vw,6rem)] font-normal leading-[1.48] text-[#fff7e6] drop-shadow-[0_16px_40px_rgba(0,0,0,0.68)] sm:pb-3 sm:text-[clamp(3rem,6vw,6rem)] sm:leading-[1.65]",
            ].join(" ")}
          >
            <span className="block sm:inline">
              {copy.titleFirst}
            </span>

            <span className="mt-1 block bg-[linear-gradient(100deg,#fff2c8_0%,#f0ce75_32%,#c68c24_66%,#ffe7a2_100%)] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(225,181,80,0.2)] sm:mx-3 sm:mt-0 sm:inline">
              {copy.titleHighlight}
            </span>
          </motion.h1>

          {/* توضیح */}
          <motion.p
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: 16,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.38,
              duration: 0.8,
            }}
            className="max-w-xl text-center text-[13px] font-normal leading-7 text-[#f8efdf]/80 [text-wrap:balance] sm:max-w-2xl sm:text-base sm:leading-9"
          >
            {copy.description}
          </motion.p>

          {/* دکمه‌ها */}
          <motion.div
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: 18,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.5,
              duration: 0.85,
            }}
            className="mt-6 flex w-full max-w-[420px] flex-col items-stretch justify-center gap-3 min-[470px]:flex-row sm:mt-7"
          >
            {/* دکمه اصلی */}
            <Link
              href={`/${locale}/collections`}
              className="group relative isolate flex h-[50px] flex-1 items-center justify-center overflow-hidden rounded-[13px] border border-[#efd181]/62 bg-[linear-gradient(140deg,rgba(12,91,64,0.98),rgba(3,49,34,0.99)_52%,rgba(44,32,8,0.98))] px-5 text-[12px] font-semibold text-[#fff0bd] shadow-[0_16px_40px_rgba(0,0,0,0.42),0_0_28px_rgba(223,181,78,0.12)] transition duration-500 hover:-translate-y-1 hover:border-[#ffe7a4] hover:shadow-[0_22px_52px_rgba(0,0,0,0.52),0_0_36px_rgba(230,187,82,0.26)] sm:text-[13px]"
            >
              <span className="pointer-events-none absolute inset-[3px] rounded-[10px] border border-[#f5dc98]/13" />

              <span className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-[#fff0bc]/85 to-transparent" />

              <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent blur-sm transition-transform duration-1000 group-hover:translate-x-[560%]" />

              <span className="pointer-events-none absolute start-3 top-1/2 size-2 -translate-y-1/2 rotate-45 border border-[#e8c872]/55 bg-[#0b5b40]" />

              <span className="pointer-events-none absolute end-3 top-1/2 size-2 -translate-y-1/2 rotate-45 border border-[#e8c872]/55 bg-[#0b5b40]" />

              <span className="relative z-10 flex items-center justify-center gap-2.5">
                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  aria-hidden="true"
                  className="size-[17px] text-[#f3d783]"
                >
                  <path
                    d="M8 12L12.5 7H19.5L24 12L16 25L8 12Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M8 12H24M12.5 7L16 12L19.5 7M16 12V25"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.82"
                  />
                </svg>

                <span>
                  {copy.primaryAction}
                </span>
              </span>
            </Link>

            {/* دکمه دوم */}
            <Link
              href={`/${locale}/products`}
              className="group relative isolate flex h-[50px] flex-1 items-center justify-center overflow-hidden rounded-[13px] border border-[#dfc16f]/34 bg-[linear-gradient(140deg,rgba(2,24,17,0.8),rgba(8,67,47,0.62))] px-5 text-[12px] font-medium text-[#f8e9c8] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_16px_38px_rgba(0,0,0,0.34)] backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-[#eccd77]/66 hover:bg-[linear-gradient(140deg,rgba(3,36,25,0.92),rgba(12,88,62,0.72))] hover:text-[#ffe4a0] sm:text-[13px]"
            >
              <span className="pointer-events-none absolute inset-[3px] rounded-[10px] border border-white/[0.04]" />

              <span className="pointer-events-none absolute inset-x-7 bottom-0 h-px bg-gradient-to-r from-transparent via-[#e5c56d]/62 to-transparent" />

              <span className="pointer-events-none absolute start-3 top-1/2 size-2 -translate-y-1/2 rotate-45 border border-[#d8b65f]/35" />

              <span className="pointer-events-none absolute end-3 top-1/2 size-2 -translate-y-1/2 rotate-45 border border-[#d8b65f]/35" />

              <span className="relative z-10 flex items-center justify-center gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="size-[16px] text-[#e7c970]"
                >
                  <path
                    d="M12 3L14.15 9.85L21 12L14.15 14.15L12 21L9.85 14.15L3 12L9.85 9.85L12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinejoin="round"
                  />

                  <circle
                    cx="12"
                    cy="12"
                    r="2.3"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.7"
                  />
                </svg>

                <span>
                  {copy.secondaryAction}
                </span>
              </span>
            </Link>
          </motion.div>
        </div>

        {/* متن خوش‌آمد پایین Hero */}
        <motion.div
          initial={
            reducedMotion
              ? false
              : {
                  opacity: 0,
                  y: 12,
                }
          }
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.7,
            duration: 0.9,
          }}
          className="absolute inset-x-4 bottom-[max(1.1rem,env(safe-area-inset-bottom))] z-20 flex items-center justify-center gap-3 sm:inset-x-5 sm:bottom-7 sm:gap-4"
        >
          <span className="h-px w-8 bg-gradient-to-l from-[#dabb68]/55 to-transparent sm:w-16" />

          <a
            href="#trust"
            className="group flex items-center gap-2 whitespace-nowrap text-[9px] font-medium tracking-[0.08em] text-[#ecd184]/66 transition hover:text-[#ffe3a0] sm:text-[10px]"
          >
            <span>{copy.welcome}</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="size-3.5 animate-bounce text-[#e6c873]/70"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>

          <span className="h-px w-8 bg-gradient-to-r from-[#dabb68]/55 to-transparent sm:w-16" />
        </motion.div>
      </div>
    </section>
  );
}