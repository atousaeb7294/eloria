"use client";

import {
  AnimatePresence,
  motion,
} from "motion/react";

import {
  useGSAP,
} from "@gsap/react";

import gsap from "gsap";

gsap.registerPlugin(
  useGSAP,
);

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

const INTRO_SESSION_KEY = "eloria_intro_seen_v5";

/**
 * با تغییر این مقدار، مرورگر نسخه جدید ویدئوهای Intro را
 * به‌جای فایل Cache‌شده قبلی دریافت می‌کند.
 */
const INTRO_ASSET_VERSION =
  "2026-08-04-gsap-sigil-v5";

const INTRO_VIDEO_ONE_SRC =
  `/videos/eloria-opening-v3.mp4?v=${INTRO_ASSET_VERSION}`;

const INTRO_VIDEO_TWO_SRC =
  `/videos/eloria-entry-v3.mp4?v=${INTRO_ASSET_VERSION}`;

const ENTRY_LABEL_FA =
  "\u0648\u0631\u0648\u062f \u0628\u0647 \u062f\u0646\u06cc\u0627\u06cc \u0627\u0644\u0648\u0631\u06cc\u0627";

const ENTRY_SUBTITLE_FA =
  "\u0645\u064f\u0647\u0631 \u0627\u0644\u0648\u0631\u06cc\u0627 \u0631\u0627 \u0628\u06af\u0634\u0627";

type EloriaSigilEntryButtonProps = {
  isPersian: boolean;
  onActivate: () => void;
};

function EloriaSigilEntryButton({
  isPersian,
  onActivate,
}: EloriaSigilEntryButtonProps) {
  const scopeRef =
    useRef<HTMLDivElement>(
      null,
    );

  const buttonRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const frameRef =
    useRef<SVGSVGElement>(
      null,
    );

  const crystalRef =
    useRef<SVGGElement>(
      null,
    );

  const glowRef =
    useRef<HTMLSpanElement>(
      null,
    );

  const activatingRef =
    useRef(false);

  useGSAP(
    () => {
      const timeline =
        gsap.timeline({
          defaults: {
            ease:
              "power3.out",
          },
        });

      timeline
        .from(
          ".eloria-sigil-shell",
          {
            opacity:
              0,
            y:
              20,
            scale:
              0.94,
            filter:
              "blur(10px)",
            duration:
              0.8,
          },
        )
        .from(
          ".eloria-sigil-stroke",
          {
            strokeDashoffset:
              1,
            duration:
              1.15,
            stagger:
              0.08,
            ease:
              "power2.inOut",
          },
          "-=0.48",
        )
        .from(
          ".eloria-sigil-corner",
          {
            opacity:
              0,
            scale:
              0.45,
            transformOrigin:
              "center",
            duration:
              0.55,
            stagger:
              0.07,
          },
          "-=0.72",
        )
        .from(
          ".eloria-sigil-copy",
          {
            opacity:
              0,
            y:
              7,
            duration:
              0.55,
          },
          "-=0.42",
        );

      gsap.to(
        crystalRef.current,
        {
          scale:
            1.06,
          filter:
            "drop-shadow(0 0 11px rgba(255,225,141,0.85))",
          duration:
            1.8,
          repeat:
            -1,
          yoyo:
            true,
          ease:
            "sine.inOut",
          transformOrigin:
            "center",
        },
      );

      gsap.to(
        glowRef.current,
        {
          opacity:
            0.7,
          scaleX:
            1.06,
          duration:
            2.4,
          repeat:
            -1,
          yoyo:
            true,
          ease:
            "sine.inOut",
        },
      );

      const sparks =
        gsap.utils.toArray<HTMLElement>(
          ".eloria-sigil-spark",
        );

      sparks.forEach(
        (
          spark,
          index,
        ) => {
          gsap.to(
            spark,
            {
              y:
                index % 2 === 0
                  ? -8
                  : -12,
              x:
                index % 3 === 0
                  ? 4
                  : -3,
              opacity:
                0.95,
              scale:
                1.35,
              duration:
                1.7 +
                index *
                  0.14,
              repeat:
                -1,
              yoyo:
                true,
              delay:
                index *
                0.18,
              ease:
                "sine.inOut",
            },
          );
        },
      );

      gsap.fromTo(
        ".eloria-sigil-shimmer",
        {
          xPercent:
            -210,
          opacity:
            0,
        },
        {
          xPercent:
            520,
          opacity:
            0.58,
          duration:
            1.65,
          repeat:
            -1,
          repeatDelay:
            2.4,
          ease:
            "power2.inOut",
        },
      );
    },
    {
      scope:
        scopeRef,
    },
  );

  const handlePointerEnter =
    useCallback(() => {
      if (
        activatingRef.current
      ) {
        return;
      }

      const scope =
        scopeRef.current;

      gsap.to(
        buttonRef.current,
        {
          y:
            -3,
          scale:
            1.018,
          duration:
            0.35,
          ease:
            "power2.out",
        },
      );

      gsap.to(
        frameRef.current,
        {
          filter:
            "drop-shadow(0 0 8px rgba(255,226,145,0.55)) drop-shadow(0 0 22px rgba(86,151,105,0.28))",
          duration:
            0.35,
        },
      );

      gsap.to(
        scope?.querySelectorAll(
          ".eloria-sigil-primary",
        ) ?? [],
        {
          stroke:
            "#fff1bb",
          duration:
            0.32,
        },
      );

      gsap.to(
        crystalRef.current,
        {
          scale:
            1.16,
          duration:
            0.35,
          ease:
            "back.out(2)",
        },
      );

      gsap.to(
        glowRef.current,
        {
          opacity:
            0.92,
          scaleX:
            1.13,
          duration:
            0.35,
        },
      );
    }, []);

  const handlePointerLeave =
    useCallback(() => {
      if (
        activatingRef.current
      ) {
        return;
      }

      const scope =
        scopeRef.current;

      gsap.to(
        buttonRef.current,
        {
          y:
            0,
          scale:
            1,
          duration:
            0.38,
          ease:
            "power2.out",
        },
      );

      gsap.to(
        frameRef.current,
        {
          filter:
            "drop-shadow(0 0 0 rgba(0,0,0,0))",
          duration:
            0.38,
        },
      );

      gsap.to(
        scope?.querySelectorAll(
          ".eloria-sigil-primary",
        ) ?? [],
        {
          stroke:
            "#dfbf69",
          duration:
            0.38,
        },
      );

      gsap.to(
        crystalRef.current,
        {
          scale:
            1.04,
          duration:
            0.38,
        },
      );

      gsap.to(
        glowRef.current,
        {
          opacity:
            0.58,
          scaleX:
            1,
          duration:
            0.38,
        },
      );
    }, []);

  const handleClick =
    useCallback(() => {
      if (
        activatingRef.current
      ) {
        return;
      }

      activatingRef.current =
        true;

      const scope =
        scopeRef.current;

      gsap
        .timeline({
          onComplete:
            onActivate,
        })
        .to(
          crystalRef.current,
          {
            scale:
              1.35,
            filter:
              "drop-shadow(0 0 20px rgba(255,245,204,1))",
            duration:
              0.18,
            ease:
              "power2.out",
          },
        )
        .to(
          scope?.querySelectorAll(
            ".eloria-sigil-stroke",
          ) ?? [],
          {
            stroke:
              "#fff7d2",
            strokeWidth:
              1.7,
            duration:
              0.18,
          },
          "<",
        )
        .to(
          glowRef.current,
          {
            opacity:
              1,
            scaleX:
              1.22,
            scaleY:
              1.35,
            duration:
              0.2,
          },
          "<",
        )
        .to(
          buttonRef.current,
          {
            opacity:
              0,
            scale:
              1.035,
            y:
              -7,
            filter:
              "brightness(1.65)",
            duration:
              0.32,
            ease:
              "power2.in",
          },
        );
    }, [
      onActivate,
    ]);

  const clipPath =
    "polygon(10% 0, 44% 0, 50% 7%, 56% 0, 90% 0, 94% 13%, 100% 27%, 100% 73%, 94% 87%, 90% 100%, 10% 100%, 6% 87%, 0 73%, 0 27%, 6% 13%)";

  return (
    <div
      ref={scopeRef}
      className="absolute inset-x-0 bottom-[max(0.05rem,env(safe-area-inset-bottom))] z-[135] flex justify-center px-3 sm:bottom-[max(0.2rem,env(safe-area-inset-bottom))]"
    >
      <div className="eloria-sigil-shell relative w-full max-w-[304px] sm:max-w-[334px]">
        <span
          ref={glowRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-7 -bottom-1 h-8 bg-[radial-gradient(ellipse,rgba(233,194,101,0.35),rgba(72,130,91,0.17)_45%,transparent_74%)] opacity-55 blur-xl"
        />

        {[
          ["7%", "18%"],
          ["92%", "28%"],
          ["14%", "78%"],
          ["84%", "82%"],
          ["48%", "-4%"],
        ].map(
          (
            position,
            index,
          ) => (
            <span
              key={index}
              aria-hidden="true"
              className="eloria-sigil-spark pointer-events-none absolute z-30 size-[3px] rounded-full bg-[#fff0b4] opacity-25 shadow-[0_0_7px_#ffe29a,0_0_15px_rgba(154,217,169,0.52)]"
              style={{
                left:
                  position[0],
                top:
                  position[1],
              }}
            />
          ),
        )}

        <button
          ref={buttonRef}
          type="button"
          onClick={handleClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          aria-label={
            isPersian
              ? ENTRY_LABEL_FA
              : "Enter the World of Eloria"
          }
          className="relative isolate block min-h-[64px] w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#f5dc94] focus-visible:ring-offset-2 focus-visible:ring-offset-[#03110b] sm:min-h-[68px]"
          style={{
            clipPath,
          }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-[2px] bg-[linear-gradient(115deg,rgba(2,17,12,0.98),rgba(5,39,28,0.96)_48%,rgba(22,20,8,0.98))] shadow-[inset_0_1px_0_rgba(255,245,202,0.11),inset_0_-10px_24px_rgba(0,0,0,0.28),0_12px_34px_rgba(0,0,0,0.48)]"
            style={{
              clipPath,
            }}
          />

          <span
            aria-hidden="true"
            className="absolute inset-[3px] bg-[radial-gradient(circle_at_50%_-25%,rgba(255,231,157,0.16),transparent_42%),radial-gradient(circle_at_8%_50%,rgba(92,160,112,0.1),transparent_36%),radial-gradient(circle_at_92%_50%,rgba(202,158,63,0.1),transparent_36%)]"
            style={{
              clipPath,
            }}
          />

          <span
            aria-hidden="true"
            className="eloria-sigil-shimmer pointer-events-none absolute -inset-y-3 -left-1/4 z-10 w-12 -skew-x-[24deg] bg-gradient-to-r from-transparent via-[#fff3c6]/26 to-transparent blur-sm"
          />

          <svg
            ref={frameRef}
            aria-hidden="true"
            viewBox="0 0 360 84"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 z-20 size-full overflow-visible"
            fill="none"
          >
            <path
              className="eloria-sigil-stroke eloria-sigil-primary"
              pathLength="1"
              style={{
                strokeDasharray:
                  1,
                strokeDashoffset:
                  0,
              }}
              d="M43 3H151L164 10H196L209 3H317L328 14H345L357 27V57L345 70H328L317 81H43L32 70H15L3 57V27L15 14H32L43 3Z"
              stroke="#dfbf69"
              strokeWidth="1.15"
            />

            <path
              className="eloria-sigil-stroke"
              pathLength="1"
              style={{
                strokeDasharray:
                  1,
                strokeDashoffset:
                  0,
              }}
              d="M49 9H148L161 16H199L212 9H311L321 20H339L350 31V53L339 64H321L311 75H49L39 64H21L10 53V31L21 20H39L49 9Z"
              stroke="#7d6530"
              strokeOpacity="0.92"
              strokeWidth="0.7"
            />

            <path
              className="eloria-sigil-stroke"
              pathLength="1"
              style={{
                strokeDasharray:
                  1,
                strokeDashoffset:
                  0,
              }}
              d="M61 15H142M218 15H299M61 69H142M218 69H299"
              stroke="#b5964d"
              strokeOpacity="0.72"
              strokeWidth="0.65"
            />

            <g
              ref={crystalRef}
              className="eloria-sigil-corner"
            >
              <path
                d="M180 5L188 13L184 22H176L172 13L180 5Z"
                fill="#d5af57"
                fillOpacity="0.17"
                stroke="#f0d889"
                strokeWidth="0.9"
              />
              <path
                d="M180 9L184 14L180 20L176 14L180 9Z"
                fill="#fff0b4"
                fillOpacity="0.72"
              />
              <path
                d="M180 64L186 70L180 79L174 70L180 64Z"
                fill="#6f5a2c"
                fillOpacity="0.3"
                stroke="#c8a451"
                strokeWidth="0.7"
              />
            </g>

            <g className="eloria-sigil-corner">
              <path d="M17 27L32 18L43 18L35 26L35 34L27 39L17 34Z" stroke="#c7a653" strokeWidth="0.8" />
              <path d="M17 57L32 66L43 66L35 58L35 50L27 45L17 50Z" stroke="#c7a653" strokeWidth="0.8" />
            </g>

            <g className="eloria-sigil-corner">
              <path d="M343 27L328 18L317 18L325 26L325 34L333 39L343 34Z" stroke="#c7a653" strokeWidth="0.8" />
              <path d="M343 57L328 66L317 66L325 58L325 50L333 45L343 50Z" stroke="#c7a653" strokeWidth="0.8" />
            </g>

            <path
              d="M49 42H72M288 42H311"
              stroke="#d9b85f"
              strokeOpacity="0.65"
              strokeWidth="0.7"
            />
            <path
              d="M58 38L64 42L58 46M302 38L296 42L302 46"
              stroke="#e2c36c"
              strokeWidth="0.75"
            />
          </svg>

          <span
            className="eloria-sigil-copy relative z-30 flex min-h-[64px] items-center justify-center gap-3 px-10 sm:min-h-[68px]"
            dir={
              isPersian
                ? "rtl"
                : "ltr"
            }
            style={{
              unicodeBidi:
                "plaintext",
            }}
          >
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center text-[#f0d789]"
            >
              <svg
                viewBox="0 0 32 32"
                className="size-6"
                fill="none"
              >
                <path
                  d="M16 3L19 12.5L28 16L19 19.5L16 29L13 19.5L4 16L13 12.5L16 3Z"
                  fill="currentColor"
                  fillOpacity="0.15"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M16 9L18 14L23 16L18 18L16 23L14 18L9 16L14 14L16 9Z"
                  fill="currentColor"
                  fillOpacity="0.78"
                />
              </svg>
            </span>

            <span className="flex min-w-0 flex-col items-center justify-center text-center">
              <span className="font-eloria-brand text-[13px] font-medium leading-none text-[#fff0bd] drop-shadow-[0_0_9px_rgba(255,225,148,0.2)] sm:text-[15px]">
                {isPersian
                  ? ENTRY_LABEL_FA
                  : "Enter the World of Eloria"}
              </span>

              <span className="mt-1.5 text-[7px] leading-none text-[#d2b66e]/80 sm:text-[8px]">
                {isPersian
                  ? ENTRY_SUBTITLE_FA
                  : "Break the seal of Eloria"}
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

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

      try {
        window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
      } catch {
        // Storage can be unavailable in privacy mode.
      }

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
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          let alreadySeen = false;
          try {
            alreadySeen = window.sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
          } catch {
            alreadySeen = false;
          }
          setPhase(
            window.location.hash === "#hero" || reducedMotion || alreadySeen
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
              "absolute inset-0 size-full bg-[#010b07] object-contain object-center transition-opacity duration-500",
              showFirstVideo
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            ].join(" ")}
            src={INTRO_VIDEO_ONE_SRC}
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
              "absolute inset-0 size-full bg-[#010b07] object-contain object-center transition-opacity duration-500",
              showSecondVideo
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            ].join(" ")}
            src={INTRO_VIDEO_TWO_SRC}
            poster="/images/hero/eloria-hero.jpeg"
            preload="auto"
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

        {/* قاب جادویی ورود؛ بدون حلقه یا چرخش دائمی */}
        <AnimatePresence>
          {phase === "awaiting-entry" && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 0.32,
              }}
            >
              <EloriaSigilEntryButton
                isPersian={isPersian}
                onActivate={handleEnterEloria}
              />
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