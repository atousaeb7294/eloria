"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FLASH_IN_DURATION_MS,
  INTRO_MAX_FIRST_VIDEO_SECONDS,
  TOTAL_TRANSITION_DURATION_MS,
  type EloriaIntroExperienceProps,
  type IntroPhase,
  type NetworkInformationLike,
} from "@/components/intro/eloria-intro-config";

const ENTRY_HOTSPOT_LEAD_SECONDS = 6;
const FIRST_VIDEO_TIMEOUT_MS = 12_000;
const SECOND_VIDEO_TIMEOUT_MS = 15_000;

function forceNormalPlayback(video: HTMLVideoElement) {
  video.defaultPlaybackRate = 1;
  video.playbackRate = 1;
}

export function useEloriaIntroController({
  locale,
}: EloriaIntroExperienceProps) {
  const firstVideoRef = useRef<HTMLVideoElement>(null);
  const secondVideoRef = useRef<HTMLVideoElement>(null);

  const heroRevealTimerRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const mediaWatchdogRef = useRef<number | null>(null);
  const entryStartedRef = useRef(false);

  const [phase, setPhase] = useState<IntroPhase>("checking");
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [secondVideoReady, setSecondVideoReady] = useState(false);
  const [secondVideoBuffering, setSecondVideoBuffering] = useState(false);

  const isPersian = locale === "fa";

  const clearTransitionTimers = useCallback(() => {
    if (heroRevealTimerRef.current !== null) {
      window.clearTimeout(heroRevealTimerRef.current);
      heroRevealTimerRef.current = null;
    }

    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }

    if (mediaWatchdogRef.current !== null) {
      window.clearTimeout(mediaWatchdogRef.current);
      mediaWatchdogRef.current = null;
    }
  }, []);

  const armMediaWatchdog = useCallback((callback: () => void, delay: number) => {
    if (mediaWatchdogRef.current !== null) window.clearTimeout(mediaWatchdogRef.current);
    mediaWatchdogRef.current = window.setTimeout(callback, delay);
  }, []);

  const announceIntroComplete = useCallback(() => {
    window.setTimeout(() => {
      window.dispatchEvent(
        new Event("eloria:intro-complete"),
      );
    }, 0);
  }, []);

  const prepareSecondVideo = useCallback(
    (preload: "metadata" | "auto") => {
      const video = secondVideoRef.current;

      if (!video) {
        return;
      }

      if (video.preload !== preload) {
        video.preload = preload;
      }

      if (video.readyState === 0) {
        try {
          video.load();
        } catch {
          // The browser can reject explicit loading in constrained modes.
        }
      }
    },
    [],
  );

  const completeIntro = useCallback(() => {
    clearTransitionTimers();

    setPhase("complete");
    announceIntroComplete();
  }, [
    announceIntroComplete,
    clearTransitionTimers,
  ]);

  const beginCinematicReveal = useCallback(() => {
    clearTransitionTimers();
    setSecondVideoBuffering(false);
    setPhase("flash-in");

    heroRevealTimerRef.current =
      window.setTimeout(() => {
        setPhase("hero-reveal");
      }, FLASH_IN_DURATION_MS);

    completionTimerRef.current =
      window.setTimeout(() => {
        completeIntro();
      }, TOTAL_TRANSITION_DURATION_MS);
  }, [
    clearTransitionTimers,
    completeIntro,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const reducedMotion =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

      const connection =
        (
          navigator as Navigator & {
            connection?: NetworkInformationLike;
          }
        ).connection;

      const constrainedConnection =
        connection?.saveData === true ||
        connection?.effectiveType === "slow-2g" ||
        connection?.effectiveType === "2g";

      const shouldSkip =
        window.location.hash === "#hero" ||
        reducedMotion ||
        constrainedConnection;

      if (shouldSkip) {
        setPhase("complete");
        announceIntroComplete();
        return;
      }

      setPhase("video-one");
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    announceIntroComplete,
  ]);

  useEffect(() => {
    if (phase === "video-one") {
      armMediaWatchdog(completeIntro, FIRST_VIDEO_TIMEOUT_MS);
    }
  }, [armMediaWatchdog, completeIntro, phase]);

  useEffect(() => {
    if (
      phase === "checking" ||
      phase === "complete"
    ) {
      return;
    }

    const previousHtmlOverflow =
      document.documentElement.style.overflow;

    const previousBodyOverflow =
      document.body.style.overflow;

    document.documentElement.style.overflow =
      "hidden";

    document.body.style.overflow =
      "hidden";

    return () => {
      document.documentElement.style.overflow =
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
      if (phase !== "video-one") {
        return;
      }

      const video = firstVideoRef.current;

      if (!video) {
        return;
      }

      video.muted = true;
      forceNormalPlayback(video);

      void video
        .play()
        .then(() => {
          setAutoplayBlocked(false);
          armMediaWatchdog(completeIntro, FIRST_VIDEO_TIMEOUT_MS);

          // Metadata is cheap and lets the second scene warm up
          // without competing with the first video for full bandwidth.
          prepareSecondVideo("metadata");
        })
        .catch(() => {
          setAutoplayBlocked(true);
        });
    }, [
      phase,
      prepareSecondVideo,
      armMediaWatchdog,
      completeIntro,
    ]);

  const handleManualStart =
    useCallback(() => {
      const video = firstVideoRef.current;

      if (!video) {
        completeIntro();
        return;
      }

      setAutoplayBlocked(false);
      video.muted = true;
      forceNormalPlayback(video);

      void video
        .play()
        .then(() => {
          prepareSecondVideo("metadata");
        })
        .catch(() => {
          completeIntro();
        });
    }, [
      completeIntro,
      prepareSecondVideo,
    ]);

  const handleFirstVideoEnded =
    useCallback(() => {
      setPhase("awaiting-entry");
      prepareSecondVideo("auto");
    }, [
      prepareSecondVideo,
    ]);

  const handleFirstVideoProgress =
    useCallback(() => {
      const video = firstVideoRef.current;

      if (
        !video ||
        (
          phase !== "video-one" &&
          phase !== "awaiting-entry"
        )
      ) {
        return;
      }

      if (
        video.currentTime >=
        INTRO_MAX_FIRST_VIDEO_SECONDS
      ) {
        video.pause();
        handleFirstVideoEnded();
        return;
      }

      if (
        phase === "video-one" &&
        Number.isFinite(video.duration) &&
        video.duration > 0
      ) {
        const hotspotStartAt = Math.max(
          0,
          video.duration -
            ENTRY_HOTSPOT_LEAD_SECONDS,
        );

        if (
          video.currentTime >= hotspotStartAt
        ) {
          /*
           * The call-to-action is baked into the first video.
           * Enable the transparent HTML hotspot slightly before
           * the final sequence so it is already clickable the
           * moment the visual button becomes visible.
           */
          setPhase("awaiting-entry");
          prepareSecondVideo("metadata");
        }
      }
    }, [
      handleFirstVideoEnded,
      phase,
      prepareSecondVideo,
    ]);

  const handleEnterEloria =
    useCallback(() => {
      if (entryStartedRef.current) return;
      entryStartedRef.current = true;
      const secondVideo =
        secondVideoRef.current;

      if (!secondVideo) {
        beginCinematicReveal();
        return;
      }

      prepareSecondVideo("auto");

      setSecondVideoBuffering(
        !secondVideoReady,
      );

      const firstVideo =
        firstVideoRef.current;

      firstVideo?.pause();

      setPhase("video-two");
      armMediaWatchdog(beginCinematicReveal, SECOND_VIDEO_TIMEOUT_MS);
      secondVideo.currentTime = 0;
      forceNormalPlayback(secondVideo);
      secondVideo.muted = false;

      void secondVideo
        .play()
        .catch(() => {
          secondVideo.muted = true;
          return secondVideo.play();
        })
        .catch(() => {
          beginCinematicReveal();
        });
    }, [
      beginCinematicReveal,
      armMediaWatchdog,
      prepareSecondVideo,
      secondVideoReady,
    ]);

  const handleSecondVideoPlaying =
    useCallback(() => {
      setSecondVideoBuffering(false);
      armMediaWatchdog(beginCinematicReveal, SECOND_VIDEO_TIMEOUT_MS);
    }, [armMediaWatchdog, beginCinematicReveal]);

  const handleSecondVideoWaiting =
    useCallback(() => {
      setSecondVideoBuffering(true);
      armMediaWatchdog(beginCinematicReveal, SECOND_VIDEO_TIMEOUT_MS);
    }, [armMediaWatchdog, beginCinematicReveal]);

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

export type EloriaIntroController =
  ReturnType<
    typeof useEloriaIntroController
  >;
