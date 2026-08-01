"use client";

import {
  AnimatePresence,
  motion,
} from "motion/react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type EloriaIntroExperienceProps = {
  locale: string;
};

type IntroPhase =
  | "checking"
  | "video-one"
  | "awaiting-entry"
  | "video-two"
  | "flash-in"
  | "hero-reveal"
  | "complete";

/**
 * ابتدا نور طلایی روی ویدیوی دوم افزایش می‌یابد.
 */
const FLASH_IN_DURATION_MS =
  700;

/**
 * پس از تعویض ویدیو با Hero،
 * نور و Blur به‌آرامی محو می‌شوند.
 */
const HERO_REVEAL_DURATION_MS =
  1500;

const TOTAL_TRANSITION_DURATION_MS =
  FLASH_IN_DURATION_MS +
  HERO_REVEAL_DURATION_MS;

export function EloriaIntroExperience({
  locale,
}: EloriaIntroExperienceProps) {
  const firstVideoRef =
    useRef<HTMLVideoElement>(
      null,
    );

  const secondVideoRef =
    useRef<HTMLVideoElement>(
      null,
    );

  const heroRevealTimerRef =
    useRef<number | null>(
      null,
    );

  const completionTimerRef =
    useRef<number | null>(
      null,
    );

  const [
    phase,
    setPhase,
  ] =
    useState<IntroPhase>(
      "checking",
    );

  const [
    autoplayBlocked,
    setAutoplayBlocked,
  ] =
    useState(false);

  const [
    secondVideoReady,
    setSecondVideoReady,
  ] =
    useState(false);

  const [
    secondVideoBuffering,
    setSecondVideoBuffering,
  ] =
    useState(false);

  const isPersian =
    locale === "fa";

  const clearTransitionTimers =
    useCallback(() => {
      if (
        heroRevealTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          heroRevealTimerRef.current,
        );

        heroRevealTimerRef.current =
          null;
      }

      if (
        completionTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          completionTimerRef.current,
        );

        completionTimerRef.current =
          null;
      }
    }, []);

  const completeIntro =
    useCallback(() => {
      clearTransitionTimers();

      setPhase(
        "complete",
      );
    }, [
      clearTransitionTimers,
    ]);

  /**
   * اتصال سینمایی ویدیوی دوم به Hero:
   *
   * ۱. افزایش نور روی آخرین فریم ویدیو
   * ۲. تعویض ویدیو با Hero در اوج نور
   * ۳. کاهش نور، Blur و Brightness روی Hero
   */
  const beginCinematicReveal =
    useCallback(() => {
      clearTransitionTimers();

      setSecondVideoBuffering(
        false,
      );

      setPhase(
        "flash-in",
      );

      heroRevealTimerRef.current =
        window.setTimeout(
          () => {
            setPhase(
              "hero-reveal",
            );
          },
          FLASH_IN_DURATION_MS,
        );

      completionTimerRef.current =
        window.setTimeout(
          () => {
            completeIntro();
          },
          TOTAL_TRANSITION_DURATION_MS,
        );
    }, [
      clearTransitionTimers,
      completeIntro,
    ]);

  /**
   * Intro در هر بار ورود یا بارگذاری مجدد صفحه اصلی اجرا می‌شود.
   * هیچ وضعیت تکمیل‌شده‌ای در مرورگر ذخیره نمی‌شود.
   */
  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          setPhase(
            window.location.hash === "#hero"
              ? "complete"
              : "video-one",
          );
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, []);

  /**
   * هنگام نمایش Intro، اسکرول قفل می‌شود.
   */
  useEffect(() => {
    if (
      phase ===
        "checking" ||
      phase ===
        "complete"
    ) {
      return;
    }

    const previousHtmlOverflow =
      document.documentElement
        .style.overflow;

    const previousBodyOverflow =
      document.body.style
        .overflow;

    document.documentElement
      .style.overflow =
      "hidden";

    document.body.style.overflow =
      "hidden";

    return () => {
      document.documentElement
        .style.overflow =
        previousHtmlOverflow;

      document.body.style.overflow =
        previousBodyOverflow;
    };
  }, [
    phase,
  ]);

  useEffect(() => {
    return () => {
      clearTransitionTimers();
    };
  }, [
    clearTransitionTimers,
  ]);

  const handleFirstVideoCanPlay =
    useCallback(() => {
      if (
        phase !==
        "video-one"
      ) {
        return;
      }

      const video =
        firstVideoRef.current;

      if (
        !video
      ) {
        return;
      }

      video.muted =
        true;

      void video
        .play()
        .then(() => {
          setAutoplayBlocked(
            false,
          );
        })
        .catch(() => {
          setAutoplayBlocked(
            true,
          );
        });
    }, [
      phase,
    ]);

  const handleManualStart =
    useCallback(() => {
      const video =
        firstVideoRef.current;

      if (
        !video
      ) {
        completeIntro();

        return;
      }

      setAutoplayBlocked(
        false,
      );

      video.muted =
        true;

      void video
        .play()
        .catch(() => {
          completeIntro();
        });
    }, [
      completeIntro,
    ]);

  const handleFirstVideoEnded =
    useCallback(() => {
      setPhase(
        "awaiting-entry",
      );

      const secondVideo =
        secondVideoRef.current;

      if (
        secondVideo
      ) {
        secondVideo.preload =
          "auto";

        secondVideo.load();
      }
    }, []);

  const handleEnterEloria =
    useCallback(() => {
      const secondVideo =
        secondVideoRef.current;

      if (
        !secondVideo
      ) {
        beginCinematicReveal();

        return;
      }

      setSecondVideoBuffering(
        !secondVideoReady,
      );

      setPhase(
        "video-two",
      );

      secondVideo.currentTime =
        0;

      /**
       * چون پخش بعد از کلیک کاربر انجام می‌شود،
       * ابتدا پخش با صدا امتحان می‌شود.
       */
      secondVideo.muted =
        false;

      void secondVideo
        .play()
        .catch(() => {
          /*
           * اگر مرورگر پخش با صدا را نپذیرفت،
           * ویدیو به‌صورت بی‌صدا اجرا می‌شود.
           */
          secondVideo.muted =
            true;

          return secondVideo.play();
        })
        .catch(() => {
          beginCinematicReveal();
        });
    }, [
      beginCinematicReveal,
      secondVideoReady,
    ]);

  const handleSecondVideoPlaying =
    useCallback(() => {
      setSecondVideoBuffering(
        false,
      );
    }, []);

  const handleSecondVideoWaiting =
    useCallback(() => {
      setSecondVideoBuffering(
        true,
      );
    }, []);

  const handleVideoFailure =
    useCallback(() => {
      completeIntro();
    }, [
      completeIntro,
    ]);

  if (
    phase ===
    "complete"
  ) {
    return null;
  }

  const showFirstVideo =
    phase ===
      "video-one" ||
    phase ===
      "awaiting-entry";

  const showSecondVideo =
    phase ===
      "video-two" ||
    phase ===
      "flash-in";

  const transitionActive =
    phase ===
      "flash-in" ||
    phase ===
      "hero-reveal";

  const heroIsRevealing =
    phase ===
    "hero-reveal";

  const introStep =
    phase === "video-two" ||
    phase === "flash-in" ||
    phase === "hero-reveal"
      ? 2
      : 1;

  const introStatus =
    isPersian
      ? introStep === 1
        ? "پرده نخست"
        : "پرده دوم"
      : introStep === 1
        ? "Act One"
        : "Act Two";

  return (
    <AnimatePresence>
      <motion.div
        key="eloria-intro"
        initial={{
          opacity:
            1,
        }}
        className="eloria-intro-root fixed inset-0 z-[100] overflow-hidden"
        aria-label={
          isPersian
            ? "ورود سینمایی به دنیای الوریا"
            : "Cinematic entrance to Eloria"
        }
      >
        {/*
         * این لایه هنگام اوج نور محو می‌شود
         * و Hero واقعی زیر آن دیده خواهد شد.
         */}
        <motion.div
          className="absolute inset-0 bg-[#010b07]"
          initial={false}
          animate={
            phase ===
            "flash-in"
              ? {
                  opacity:
                    1,

                  scale:
                    1.035,

                  filter:
                    "brightness(1.75) saturate(1.15) blur(1px)",
                }
              : heroIsRevealing
                ? {
                    opacity:
                      0,

                    scale:
                      1.09,

                    filter:
                      "brightness(2.8) saturate(1.25) blur(12px)",
                  }
                : {
                    opacity:
                      1,

                    scale:
                      1,

                    filter:
                      "brightness(1) saturate(1) blur(0px)",
                  }
          }
          transition={
            heroIsRevealing
              ? {
                  duration:
                    0.48,

                  ease: [
                    0.16,
                    1,
                    0.3,
                    1,
                  ],
                }
              : {
                  duration:
                    FLASH_IN_DURATION_MS /
                    1000,

                  ease:
                    "easeIn",
                }
          }
        >
          <video
            ref={
              firstVideoRef
            }
            className={[
              "absolute inset-0 size-full object-cover object-[center_48%] transition-opacity duration-700 sm:object-center",
              showFirstVideo
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            ].join(" ")}
            src="/videos/eloria-intro-01.mp4"
            poster="/images/hero/eloria-hero.jpeg"
            preload="auto"
            autoPlay
            muted
            playsInline
            disablePictureInPicture
            controls={false}
            onCanPlay={
              handleFirstVideoCanPlay
            }
            onEnded={
              handleFirstVideoEnded
            }
            onError={
              handleVideoFailure
            }
          />

          <video
            ref={
              secondVideoRef
            }
            className={[
              "absolute inset-0 size-full object-cover object-[center_48%] transition-opacity duration-700 sm:object-center",
              showSecondVideo
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            ].join(" ")}
            src="/videos/eloria-intro-02.mp4"
            poster="/images/hero/eloria-hero.jpeg"
            preload="metadata"
            playsInline
            disablePictureInPicture
            controls={false}
            onCanPlay={() => {
              setSecondVideoReady(
                true,
              );
            }}
            onPlaying={
              handleSecondVideoPlaying
            }
            onWaiting={
              handleSecondVideoWaiting
            }
            onEnded={
              beginCinematicReveal
            }
            onError={
              handleVideoFailure
            }
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,7,4,0.13),transparent_34%,transparent_67%,rgba(0,9,5,0.6))]"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,7,4,0.14)_66%,rgba(0,4,2,0.65)_100%)]"
          />

          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,transparent,rgba(0,7,4,0.72))] sm:h-[34%]"
          />
        </motion.div>

        {/*
         * نور متمرکز از داخل در شروع می‌شود،
         * ولی Hero دیگر از یک Mask دایره‌ای ظاهر نمی‌شود.
         */}
        <motion.div
          aria-hidden="true"
          className="eloria-door-light pointer-events-none absolute"
          initial={false}
          animate={
            phase ===
            "flash-in"
              ? {
                  opacity:
                    1,

                  scale:
                    3.2,
                }
              : heroIsRevealing
                ? {
                    opacity:
                      0,

                    scale:
                      5.5,
                  }
                : {
                    opacity:
                      0,

                    scale:
                      0.25,
                  }
          }
          transition={
            heroIsRevealing
              ? {
                  duration:
                    HERO_REVEAL_DURATION_MS /
                    1000,

                  ease:
                    "easeOut",
                }
              : {
                  duration:
                    FLASH_IN_DURATION_MS /
                    1000,

                  ease: [
                    0.16,
                    1,
                    0.3,
                    1,
                  ],
                }
          }
        />

        {/*
         * نور طلایی تمام صفحه.
         * در اوج این نور، ویدیو با Hero تعویض می‌شود.
         */}
        <motion.div
          aria-hidden="true"
          className="eloria-full-gold-wash pointer-events-none absolute inset-0"
          initial={false}
          animate={
            phase ===
            "flash-in"
              ? {
                  opacity:
                    1,
                }
              : heroIsRevealing
                ? {
                    opacity:
                      0,
                }
                : {
                    opacity:
                      0,
                }
          }
          transition={
            heroIsRevealing
              ? {
                  duration:
                    HERO_REVEAL_DURATION_MS /
                    1000,

                  ease: [
                    0.22,
                    1,
                    0.36,
                    1,
                  ],
                }
              : {
                  duration:
                    FLASH_IN_DURATION_MS /
                    1000,

                  ease:
                    "easeIn",
                }
          }
        />

        {/*
         * در لحظه آشکارشدن Hero، این لایه
         * Brightness و Blur ایجاد می‌کند و سپس محو می‌شود.
         */}
        <motion.div
          aria-hidden="true"
          className="eloria-hero-exposure pointer-events-none absolute inset-0"
          initial={false}
          animate={
            phase ===
            "flash-in"
              ? {
                  opacity:
                    1,
                }
              : heroIsRevealing
                ? {
                    opacity:
                      0,
                }
                : {
                    opacity:
                      0,
                }
          }
          transition={
            heroIsRevealing
              ? {
                  duration:
                    HERO_REVEAL_DURATION_MS /
                    1000,

                  ease: [
                    0.16,
                    1,
                    0.3,
                    1,
                  ],
                }
              : {
                  duration:
                    0.35,

                  ease:
                    "easeIn",
                }
          }
        />

        {/*
         * خط نور افقی کوتاه در زمان تعویض.
         */}
        <motion.div
          aria-hidden="true"
          className="eloria-light-line pointer-events-none absolute left-1/2 top-1/2 h-px -translate-x-1/2"
          initial={false}
          animate={
            transitionActive
              ? {
                  width:
                    heroIsRevealing
                      ? "120vw"
                      : "48vw",

                  opacity:
                    heroIsRevealing
                      ? 0
                      : 1,
                }
              : {
                  width:
                    "0vw",

                  opacity:
                    0,
                }
          }
          transition={{
            duration:
              heroIsRevealing
                ? 1.1
                : 0.55,

            ease:
              "easeOut",
          }}
        />

        {/* نشانگر مرحله Intro */}
        {!transitionActive && phase !== "checking" && (
          <div
            className="absolute start-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] z-[130] flex items-center gap-3 rounded-full border border-[#e7ca78]/22 bg-black/25 px-3.5 py-2 backdrop-blur-xl sm:start-8 sm:top-8"
            aria-label={
              isPersian
                ? `مرحله ${introStep} از ۲`
                : `Step ${introStep} of 2`
            }
          >
            <span className="font-eloria-brand text-[9px] text-[#f0d98e]/82 sm:text-[10px]">
              ELORIA
            </span>

            <span className="h-3 w-px bg-[#e3c66f]/24" />

            <span className="text-[9px] font-medium tracking-[0.08em] text-white/62 sm:text-[10px]">
              {introStatus}
            </span>

            <span className="flex items-center gap-1" aria-hidden="true">
              {[1, 2].map((step) => (
                <span
                  key={step}
                  className={[
                    "h-1 rounded-full transition-all duration-500",
                    step <= introStep
                      ? "w-4 bg-[#efd382] shadow-[0_0_10px_rgba(239,211,130,0.48)]"
                      : "w-2 bg-white/18",
                  ].join(" ")}
                />
              ))}
            </span>
          </div>
        )}

        {/* دکمه ردکردن */}
        {!transitionActive && (
          <button
            type="button"
            onClick={
              completeIntro
            }
            className="absolute end-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-[130] min-h-11 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-[11px] tracking-[0.1em] text-white/72 backdrop-blur-xl transition duration-300 hover:border-[#e7ca78]/60 hover:bg-black/45 hover:text-[#f5dda0] sm:end-8 sm:top-8"
          >
            {isPersian
              ? "رد کردن"
              : "Skip"}
          </button>
        )}

        {/* بارگذاری اولیه */}
        {phase ===
          "checking" && (
          <div className="absolute inset-0 z-[140] grid place-items-center bg-[#010b07]">
            <div className="flex flex-col items-center gap-4">
              <span className="size-10 animate-spin rounded-full border border-[#e6c975]/20 border-t-[#f4dc96]" />

              <span className="font-eloria-brand text-[10px] text-[#e8ce87]/70">
                ELORIA
              </span>
            </div>
          </div>
        )}

        {/* شروع دستی ویدیوی اول */}
        {autoplayBlocked &&
          phase ===
            "video-one" && (
            <div className="absolute inset-0 z-[135] grid place-items-center bg-black/50 px-6 backdrop-blur-sm">
              <button
                type="button"
                onClick={
                  handleManualStart
                }
                className="group relative min-h-12 w-full max-w-xs overflow-hidden rounded-full border border-[#efd17f]/65 bg-[linear-gradient(135deg,rgba(222,187,99,0.25),rgba(6,64,44,0.82))] px-7 py-3.5 text-sm text-[#ffebaf] shadow-[0_0_48px_rgba(226,190,98,0.22)] transition duration-500 hover:scale-[1.03] hover:border-[#ffe09a]"
              >
                <span className="absolute inset-0 translate-y-full bg-gradient-to-t from-[#f0ce75]/20 to-transparent transition-transform duration-500 group-hover:translate-y-0" />

                <span className="relative">
                  {isPersian
                    ? "شروع سفر"
                    : "Begin the journey"}
                </span>
              </button>
            </div>
          )}

        {/* دکمه ورود به دنیای الوریا */}
        <AnimatePresence>
          {phase ===
            "awaiting-entry" && (
            <motion.div
              initial={{
                opacity:
                  0,

                y:
                  38,

                scale:
                  0.86,
              }}
              animate={{
                opacity:
                  1,

                y:
                  0,

                scale:
                  1,
              }}
              exit={{
                opacity:
                  0,

                y:
                  -22,

                scale:
                  1.08,
              }}
              transition={{
                duration:
                  0.95,

                ease: [
                  0.16,
                  1,
                  0.3,
                  1,
                ],
              }}
              className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] z-[130] flex justify-center px-4 sm:bottom-[11vh] sm:px-6"
            >
              <div className="relative flex w-full max-w-[390px] items-center justify-center">
                {/* هاله تنفسی پشت دکمه */}
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute h-32 w-[25rem] max-w-[92vw] rounded-full bg-[radial-gradient(ellipse,rgba(255,232,159,0.44),rgba(220,174,67,0.18)_40%,transparent_73%)] blur-2xl"
                  animate={{
                    opacity: [
                      0.38,
                      0.98,
                      0.38,
                    ],

                    scale: [
                      0.88,
                      1.18,
                      0.88,
                    ],
                  }}
                  transition={{
                    duration:
                      2.7,

                    repeat:
                      Infinity,

                    ease:
                      "easeInOut",
                  }}
                />

                {/* حلقه‌های جادویی */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 size-[16.5rem] -translate-x-1/2 -translate-y-1/2 min-[380px]:size-[18.5rem] sm:size-[22rem]"
                >
                  <motion.span
                    className="absolute inset-0 rounded-full border border-dashed border-[#f6dc94]/24"
                    animate={{
                      rotate:
                        360,
                    }}
                    transition={{
                      duration:
                        21,

                      repeat:
                        Infinity,

                      ease:
                        "linear",
                    }}
                  />

                  <motion.span
                    className="absolute inset-6 rounded-full border border-[#d9af53]/22"
                    animate={{
                      rotate:
                        -360,
                    }}
                    transition={{
                      duration:
                        14,

                      repeat:
                        Infinity,

                      ease:
                        "linear",
                    }}
                  />

                  <motion.span
                    className="absolute inset-12 rounded-full border border-dotted border-[#ffe3a0]/18"
                    animate={{
                      rotate:
                        360,
                    }}
                    transition={{
                      duration:
                        10,

                      repeat:
                        Infinity,

                      ease:
                        "linear",
                    }}
                  />

                  <motion.span
                    className="absolute left-1/2 top-0 size-2.5 -translate-x-1/2 rounded-full bg-[#ffe8a3] shadow-[0_0_12px_#ffe8a3,0_0_36px_rgba(239,195,91,0.9)]"
                    animate={{
                      scale: [
                        0.65,
                        1.45,
                        0.65,
                      ],

                      opacity: [
                        0.42,
                        1,
                        0.42,
                      ],
                    }}
                    transition={{
                      duration:
                        1.8,

                      repeat:
                        Infinity,

                      ease:
                        "easeInOut",
                    }}
                  />
                </div>

                <motion.button
                  type="button"
                  onClick={
                    handleEnterEloria
                  }
                  whileHover={{
                    scale:
                      1.045,

                    y:
                      -4,
                  }}
                  whileTap={{
                    scale:
                      0.97,
                  }}
                  className="group relative isolate w-full max-w-[365px] overflow-hidden rounded-full border border-[#ffe19a]/80 bg-[linear-gradient(135deg,rgba(247,219,141,0.3),rgba(184,133,39,0.14)_35%,rgba(7,71,49,0.94)_78%)] px-[5px] py-[5px] text-[#fff4cb] shadow-[0_24px_75px_rgba(0,0,0,0.62),0_0_28px_rgba(255,218,123,0.25),0_0_80px_rgba(210,158,48,0.2)] backdrop-blur-2xl transition-shadow duration-500 hover:shadow-[0_28px_85px_rgba(0,0,0,0.68),0_0_40px_rgba(255,226,143,0.48),0_0_100px_rgba(222,171,57,0.32)] sm:min-w-[365px]"
                >
                  {/* حاشیه طلایی چرخان */}
                  <motion.span
                    aria-hidden="true"
                    className="absolute -inset-[80%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,232,163,1)_48deg,transparent_112deg,rgba(205,148,33,0.9)_205deg,transparent_286deg)]"
                    animate={{
                      rotate:
                        360,
                    }}
                    transition={{
                      duration:
                        6,

                      repeat:
                        Infinity,

                      ease:
                        "linear",
                    }}
                  />

                  <span className="absolute inset-[2px] rounded-full border border-white/10 bg-[linear-gradient(125deg,rgba(13,92,65,0.98),rgba(2,31,22,0.99)_48%,rgba(76,52,12,0.97))]" />

                  <span className="absolute inset-[3px] rounded-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,237,180,0.26),transparent_50%)]" />

                  <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent blur-sm transition-transform duration-1000 group-hover:translate-x-[540%]" />

                  <span className="relative z-10 flex min-h-[60px] items-center justify-between gap-4 rounded-full px-4 sm:min-h-[64px] sm:gap-5 sm:px-6">
                    <span className="flex flex-col items-start">
                      <span className="text-[12px] font-medium tracking-[0.08em] text-[#fff0bb] min-[380px]:text-[13px] sm:text-[15px] sm:tracking-[0.12em]">
                        {isPersian
                          ? "ورود به دنیای الوریا"
                          : "Enter the World of Eloria"}
                      </span>

                      <span className="mt-1 text-[8px] tracking-[0.08em] text-[#d9bd78]/75 min-[380px]:text-[9px] sm:mt-1.5 sm:text-[10px] sm:tracking-[0.14em]">
                        {isPersian
                          ? "آغاز یک روایت افسانه‌ای"
                          : "Begin the legendary journey"}
                      </span>
                    </span>

                    <motion.span
                      aria-hidden="true"
                      className="grid size-11 shrink-0 place-items-center rounded-full border border-[#f3d584]/55 bg-[#e0b959]/10 text-[#ffe6a0] shadow-[inset_0_0_18px_rgba(255,231,161,0.14),0_0_20px_rgba(225,180,76,0.22)]"
                      animate={{
                        x: [
                          0,
                          isPersian
                            ? -4
                            : 4,
                          0,
                        ],
                      }}
                      transition={{
                        duration:
                          1.7,

                        repeat:
                          Infinity,

                        ease:
                          "easeInOut",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className={[
                          "size-5",
                          isPersian
                            ? "rotate-180"
                            : "",
                        ].join(" ")}
                      >
                        <path
                          d="M5 12H19M13 6L19 12L13 18"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </motion.span>
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buffer ویدیوی دوم */}
        <AnimatePresence>
          {phase ===
            "video-two" &&
            secondVideoBuffering && (
              <motion.div
                initial={{
                  opacity:
                    0,
                }}
                animate={{
                  opacity:
                    1,
                }}
                exit={{
                  opacity:
                    0,
                }}
                className="pointer-events-none absolute inset-0 z-[125] grid place-items-center bg-black/20 backdrop-blur-[2px]"
                role="status"
                aria-live="polite"
              >
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-5 py-4 backdrop-blur-xl">
                  <span className="size-9 animate-spin rounded-full border border-white/20 border-t-[#f1d68d]" />
                  <span className="text-[10px] tracking-[0.08em] text-white/64">
                    {isPersian ? "آماده‌سازی ادامه روایت" : "Preparing the next scene"}
                  </span>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        <style jsx global>{`
          .eloria-intro-root {
            --eloria-door-x: 50%;
            --eloria-door-y: 52%;
          }

          .eloria-door-light {
            left:
              var(
                --eloria-door-x
              );

            top:
              var(
                --eloria-door-y
              );

            width:
              min(
                30rem,
                54vw
              );

            height:
              min(
                42rem,
                80vh
              );

            transform:
              translate(
                -50%,
                -50%
              );

            transform-origin:
              center;

            border-radius:
              48% 48% 42% 42% /
              38% 38% 56% 56%;

            background:
              radial-gradient(
                ellipse,
                rgba(
                    255,
                    255,
                    244,
                    1
                  )
                  0%,
                rgba(
                    255,
                    242,
                    196,
                    0.98
                  )
                  18%,
                rgba(
                    255,
                    211,
                    112,
                    0.84
                  )
                  40%,
                rgba(
                    208,
                    148,
                    34,
                    0.4
                  )
                  64%,
                transparent
                  84%
              );

            box-shadow:
              0 0 45px
                rgba(
                  255,
                  247,
                  213,
                  1
                ),
              0 0 120px
                rgba(
                  255,
                  215,
                  121,
                  0.9
                ),
              0 0 260px
                rgba(
                  203,
                  143,
                  26,
                  0.64
                );

            filter:
              blur(8px);

            mix-blend-mode:
              screen;
          }

          .eloria-full-gold-wash {
            background:
              radial-gradient(
                ellipse at
                  var(
                    --eloria-door-x
                  )
                  var(
                    --eloria-door-y
                  ),
                rgba(
                    255,
                    255,
                    242,
                    1
                  )
                  0%,
                rgba(
                    255,
                    241,
                    194,
                    0.98
                  )
                  18%,
                rgba(
                    255,
                    213,
                    112,
                    0.88
                  )
                  40%,
                rgba(
                    214,
                    157,
                    45,
                    0.68
                  )
                  67%,
                rgba(
                    70,
                    83,
                    42,
                    0.42
                  )
                  84%,
                rgba(
                    2,
                    20,
                    14,
                    0.2
                  )
                  100%
              );

            mix-blend-mode:
              screen;

            filter:
              saturate(1.16);
          }

          .eloria-hero-exposure {
            background:
              linear-gradient(
                135deg,
                rgba(
                    255,
                    246,
                    210,
                    0.92
                  ),
                rgba(
                    255,
                    213,
                    117,
                    0.7
                  )
                  48%,
                rgba(
                    213,
                    156,
                    48,
                    0.5
                  )
                  72%,
                rgba(
                    16,
                    96,
                    67,
                    0.26
                  )
              );

            -webkit-backdrop-filter:
              brightness(1.9)
              saturate(1.25)
              blur(10px);

            backdrop-filter:
              brightness(1.9)
              saturate(1.25)
              blur(10px);

            mix-blend-mode:
              screen;
          }

          .eloria-light-line {
            background:
              linear-gradient(
                90deg,
                transparent,
                rgba(
                    255,
                    224,
                    143,
                    0.5
                  ),
                rgba(
                    255,
                    255,
                    229,
                    1
                  ),
                rgba(
                    255,
                    224,
                    143,
                    0.5
                  ),
                transparent
              );

            box-shadow:
              0 0 18px
                rgba(
                  255,
                  244,
                  198,
                  1
                ),
              0 0 60px
                rgba(
                  255,
                  204,
                  91,
                  0.9
                );

            filter:
              blur(0.5px);
          }

          @media (
            max-width: 767px
          ) {
            .eloria-intro-root {
              --eloria-door-x: 50%;
              --eloria-door-y: 54%;
            }

            .eloria-door-light {
              width:
                min(
                  21rem,
                  72vw
                );

              height:
                min(
                  35rem,
                  72vh
                );
            }
          }

          @media (max-height: 700px) and (max-width: 767px) {
            .eloria-intro-root {
              --eloria-door-y: 50%;
            }

            .eloria-door-light {
              height: min(28rem, 68vh);
            }
          }

          @media (
            prefers-reduced-motion:
              reduce
          ) {
            .eloria-door-light,
            .eloria-full-gold-wash,
            .eloria-hero-exposure,
            .eloria-light-line {
              animation:
                none !important;

              transition:
                none !important;
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}