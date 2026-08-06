"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FLASH_IN_DURATION_MS, INTRO_MAX_FIRST_VIDEO_SECONDS, INTRO_SESSION_KEY, TOTAL_TRANSITION_DURATION_MS, type EloriaIntroExperienceProps, type IntroPhase, type NetworkInformationLike } from "@/components/intro/eloria-intro-config";

export function useEloriaIntroController({
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
          const connection = (navigator as Navigator & {
            connection?: NetworkInformationLike;
          }).connection;
          const constrainedConnection =
            connection?.saveData === true ||
            connection?.effectiveType === "slow-2g" ||
            connection?.effectiveType === "2g";
          let alreadySeen = false;
          try {
            alreadySeen = window.sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
          } catch {
            alreadySeen = false;
          }
          setPhase(
            window.location.hash === "#hero" ||
            reducedMotion ||
            constrainedConnection ||
            alreadySeen
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

  const handleFirstVideoProgress =
    useCallback(() => {
      const video = firstVideoRef.current;
      if (
        phase !== "video-one" ||
        !video ||
        video.currentTime < INTRO_MAX_FIRST_VIDEO_SECONDS
      ) {
        return;
      }

      video.pause();
      handleFirstVideoEnded();
    }, [phase, handleFirstVideoEnded]);

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

  return {
    firstVideoRef,
    secondVideoRef,
    phase,
    autoplayBlocked,
    setSecondVideoReady,
    secondVideoBuffering,
    isPersian,
    completeIntro,
    beginCinematicReveal,
    handleFirstVideoCanPlay,
    handleManualStart,
    handleFirstVideoEnded,
    handleFirstVideoProgress,
    handleEnterEloria,
    handleSecondVideoPlaying,
    handleSecondVideoWaiting,
    handleVideoFailure,
  };
}

export type EloriaIntroController = ReturnType<typeof useEloriaIntroController>;
