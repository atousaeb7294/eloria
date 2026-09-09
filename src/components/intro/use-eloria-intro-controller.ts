"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FLASH_IN_DURATION_MS,
  INTRO_EMBEDDED_ENTRY_START_SECONDS,
  INTRO_SESSION_KEY,
  INTRO_VIDEO_ONE_MOBILE_SRC,
  INTRO_VIDEO_ONE_SRC,
  INTRO_VIDEO_TWO_MOBILE_SRC,
  INTRO_VIDEO_TWO_SRC,
  TOTAL_TRANSITION_DURATION_MS,
  type EloriaIntroExperienceProps,
  type IntroPhase,
} from "@/components/intro/eloria-intro-config";

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
  const secondVideoStartTimerRef = useRef<number | null>(null);
  const firstPlaybackStartedRef = useRef(false);
  const firstPlaybackFinishedRef = useRef(false);
  const secondPlaybackStartedRef = useRef(false);
  const secondPlaybackFinishedRef = useRef(false);
  const enteringSecondVideoRef = useRef(false);

  const [phase, setPhase] = useState<IntroPhase>("checking");
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [firstVideoError, setFirstVideoError] = useState(false);
  const [secondVideoError, setSecondVideoError] = useState(false);
  const [secondVideoReady, setSecondVideoReady] = useState(false);
  const [secondVideoBuffering, setSecondVideoBuffering] = useState(false);
  const [firstEntryHotspotVisible, setFirstEntryHotspotVisible] = useState(false);
  const [useMobileVideos, setUseMobileVideos] = useState(false);

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

    if (secondVideoStartTimerRef.current !== null) {
      window.clearTimeout(secondVideoStartTimerRef.current);
      secondVideoStartTimerRef.current = null;
    }
  }, []);

  const announceIntroComplete = useCallback(() => {
    window.dispatchEvent(new Event("eloria:intro-complete"));
  }, []);

  const prepareSecondVideo = useCallback((preload: "metadata" | "auto") => {
    const video = secondVideoRef.current;
    if (!video) return;

    // Full preloading of the second 1080p act caused a visible stall on mobile.
    // Mobile still keeps metadata warm, then starts the compressed rendition on
    // the visitor's explicit entry gesture.
    const resolvedPreload = useMobileVideos && preload === "auto" ? "metadata" : preload;
    video.preload = resolvedPreload;
    if (video.readyState === 0) {
      try {
        video.load();
      } catch {
        // Loading can be refused until a user gesture. The entry click retries it.
      }
    }
  }, [useMobileVideos]);

  const completeIntro = useCallback(() => {
    clearTransitionTimers();
    firstVideoRef.current?.pause();
    secondVideoRef.current?.pause();
    setFirstEntryHotspotVisible(false);
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    } catch {
      // حالت Private یا سیاست مرورگر ممکن است Storage را غیرفعال کند.
    }
    setPhase("complete");
    announceIntroComplete();
  }, [announceIntroComplete, clearTransitionTimers]);

  const handleSkipIntro = useCallback(() => {
    firstPlaybackFinishedRef.current = true;
    secondPlaybackFinishedRef.current = true;
    enteringSecondVideoRef.current = false;
    setSecondVideoBuffering(false);
    completeIntro();
  }, [completeIntro]);

  const beginCinematicReveal = useCallback(() => {
    if (phase !== "video-two" || secondPlaybackFinishedRef.current) return;

    secondPlaybackFinishedRef.current = true;
    clearTransitionTimers();
    setSecondVideoBuffering(false);
    setPhase("flash-in");

    heroRevealTimerRef.current = window.setTimeout(() => {
      setPhase("hero-reveal");
    }, FLASH_IN_DURATION_MS);

    completionTimerRef.current = window.setTimeout(() => {
      completeIntro();
    }, TOTAL_TRANSITION_DURATION_MS);
  }, [clearTransitionTimers, completeIntro, phase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const connection = (navigator as Navigator & {
        connection?: { effectiveType?: string; saveData?: boolean };
      }).connection;
      const constrainedNetwork =
        connection?.saveData === true ||
        connection?.effectiveType === "slow-2g" ||
        connection?.effectiveType === "2g";

      setUseMobileVideos(
        window.matchMedia("(max-width: 767px)").matches || constrainedNetwork,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {

    try {
      if (window.sessionStorage.getItem(INTRO_SESSION_KEY) === "1") {
        window.setTimeout(() => {
          setPhase("complete");
          announceIntroComplete();
        }, 0);
        return;
      }
    } catch {
      // بدون Storage نیز ترتیب اجباری دو پرده اجرا می‌شود.
    }

    window.setTimeout(() => setPhase("video-one"), 0);
  }, [announceIntroComplete]);

  useEffect(() => {
    if (phase === "checking" || phase === "complete") return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [phase]);

  useEffect(() => () => clearTransitionTimers(), [clearTransitionTimers]);

  const playFirstVideo = useCallback(() => {
    const video = firstVideoRef.current;
    if (!video || phase !== "video-one" || firstPlaybackFinishedRef.current) return;

    setFirstVideoError(false);
    setAutoplayBlocked(false);
    video.muted = true;
    video.loop = false;
    forceNormalPlayback(video);

    // Never restart act one because `canplay` fires more than once.
    if (firstPlaybackStartedRef.current && !video.paused) return;
    firstPlaybackStartedRef.current = true;

    void video.play().then(() => {
      setAutoplayBlocked(false);
      prepareSecondVideo("auto");
    }).catch(() => {
      firstPlaybackStartedRef.current = false;
      setAutoplayBlocked(true);
    });
  }, [phase, prepareSecondVideo]);

  // Warm act two as soon as act one begins so the entry hotspot can start it
  // immediately on the same user gesture. This avoids the visible buffering pause.
  useEffect(() => {
    if (phase !== "video-one") return;
    prepareSecondVideo("auto");
  }, [phase, prepareSecondVideo]);

  // Start act one when the state machine enters `video-one`.
  // `canplay` can fire while the component is still in the initial `checking`
  // phase; relying on that event alone leaves the poster frozen forever.
  // Calling play() here is safe for the muted first video and the existing
  // onCanPlay handler remains as a fallback for slow-loading browsers.
  useEffect(() => {
    if (phase !== "video-one" || firstPlaybackFinishedRef.current) return;

    const video = firstVideoRef.current;
    if (!video) return;

    video.muted = true;
    video.loop = false;
    forceNormalPlayback(video);
    playFirstVideo();
  }, [phase, playFirstVideo]);

  const handleFirstVideoCanPlay = useCallback(() => {
    if (!firstPlaybackStartedRef.current) playFirstVideo();
  }, [playFirstVideo]);

  const handleManualStart = useCallback(() => {
    playFirstVideo();
  }, [playFirstVideo]);

  const handleFirstVideoEnded = useCallback(() => {
    if (phase !== "video-one" || firstPlaybackFinishedRef.current) return;

    firstPlaybackFinishedRef.current = true;
    const video = firstVideoRef.current;
    video?.pause();
    setAutoplayBlocked(false);
    setFirstVideoError(false);
    setFirstEntryHotspotVisible(true);
    setPhase("awaiting-entry");
    prepareSecondVideo("auto");
  }, [phase, prepareSecondVideo]);

  const handleFirstVideoProgress = useCallback(() => {
    const video = firstVideoRef.current;
    if (!video || phase !== "video-one" || !Number.isFinite(video.duration) || video.duration <= 0) return;

    // The visual entry control is baked into the final frames of act one.
    // Enable the invisible hit target only while that artwork is on screen.
    const shouldShow = video.currentTime >= INTRO_EMBEDDED_ENTRY_START_SECONDS;
    setFirstEntryHotspotVisible((current) => current === shouldShow ? current : shouldShow);
  }, [phase]);

  const playSecondVideo = useCallback((allowFromFirst = false) => {
    const video = secondVideoRef.current;
    const phaseAllowsPlayback = phase === "awaiting-entry" || (allowFromFirst && phase === "video-one");
    if (
      !video ||
      !phaseAllowsPlayback ||
      secondPlaybackStartedRef.current ||
      secondPlaybackFinishedRef.current
    ) {
      enteringSecondVideoRef.current = false;
      return;
    }

    secondPlaybackStartedRef.current = true;
    prepareSecondVideo("auto");
    setSecondVideoError(false);
    setSecondVideoBuffering(!secondVideoReady);
    setFirstEntryHotspotVisible(false);

    video.loop = false;
    video.currentTime = 0;
    forceNormalPlayback(video);
    video.muted = false;
    // Keep act one's final frame visible until act two has produced a real
    // playing frame. Switching the visible phase before play() resolves caused
    // the black-frame freeze seen on mobile and slower networks.
    setPhase("loading-two");

    secondVideoStartTimerRef.current = window.setTimeout(() => {
      if (!secondPlaybackStartedRef.current || secondPlaybackFinishedRef.current) return;
      video.pause();
      secondPlaybackStartedRef.current = false;
      enteringSecondVideoRef.current = false;
      setSecondVideoBuffering(false);
      setSecondVideoError(true);
      setPhase("awaiting-entry");
    }, 15_000);

    void video.play().catch(() => {
      // Safari/iOS can still reject audio on a user gesture in edge cases.
      // Retrying muted keeps act two mandatory instead of skipping to Home.
      video.muted = true;
      return video.play();
    }).catch(() => {
      if (secondVideoStartTimerRef.current !== null) {
        window.clearTimeout(secondVideoStartTimerRef.current);
        secondVideoStartTimerRef.current = null;
      }
      secondPlaybackStartedRef.current = false;
      enteringSecondVideoRef.current = false;
      setSecondVideoBuffering(false);
      setSecondVideoError(true);
      setPhase("awaiting-entry");
    });
  }, [phase, prepareSecondVideo, secondVideoReady]);

  const handleEnterEloria = useCallback(() => {
    if (phase !== "awaiting-entry" || enteringSecondVideoRef.current) return;
    enteringSecondVideoRef.current = true;
    playSecondVideo();
  }, [phase, playSecondVideo]);

  const handleEmbeddedEntry = useCallback(() => {
    if ((phase !== "video-one" && phase !== "awaiting-entry") || enteringSecondVideoRef.current) return;

    firstPlaybackFinishedRef.current = true;
    firstVideoRef.current?.pause();
    setAutoplayBlocked(false);
    setFirstVideoError(false);
    enteringSecondVideoRef.current = true;
    prepareSecondVideo("auto");
    playSecondVideo(phase === "video-one");
  }, [phase, playSecondVideo, prepareSecondVideo]);

  const handleSecondVideoPlaying = useCallback(() => {
    if (secondVideoStartTimerRef.current !== null) {
      window.clearTimeout(secondVideoStartTimerRef.current);
      secondVideoStartTimerRef.current = null;
    }
    firstVideoRef.current?.pause();
    enteringSecondVideoRef.current = false;
    setSecondVideoError(false);
    setSecondVideoBuffering(false);
    setPhase("video-two");
  }, []);

  const handleSecondVideoWaiting = useCallback(() => {
    if (phase === "video-two" || phase === "loading-two") setSecondVideoBuffering(true);
  }, [phase]);

  const handleFirstVideoFailure = useCallback(() => {
    firstVideoRef.current?.pause();
    firstPlaybackStartedRef.current = false;
    setAutoplayBlocked(false);
    setFirstEntryHotspotVisible(false);
    setFirstVideoError(true);
  }, []);

  const handleSecondVideoFailure = useCallback(() => {
    if (secondVideoStartTimerRef.current !== null) {
      window.clearTimeout(secondVideoStartTimerRef.current);
      secondVideoStartTimerRef.current = null;
    }
    secondVideoRef.current?.pause();
    secondPlaybackStartedRef.current = false;
    enteringSecondVideoRef.current = false;
    setSecondVideoBuffering(false);
    setSecondVideoError(true);
    setPhase("awaiting-entry");
  }, []);

  const retryFirstVideo = useCallback(() => {
    const video = firstVideoRef.current;
    if (!video) return;

    firstPlaybackStartedRef.current = false;
    firstPlaybackFinishedRef.current = false;
    setFirstVideoError(false);
    setFirstEntryHotspotVisible(false);
    setPhase("video-one");
    video.currentTime = 0;
    try {
      video.load();
    } catch {
      // onCanPlay/manual start will retry.
    }
  }, []);

  const retrySecondVideo = useCallback(() => {
    const video = secondVideoRef.current;
    if (!video) return;

    secondPlaybackStartedRef.current = false;
    secondPlaybackFinishedRef.current = false;
    enteringSecondVideoRef.current = false;
    setSecondVideoError(false);
    setSecondVideoReady(false);
    setSecondVideoBuffering(false);
    setPhase("awaiting-entry");
    video.currentTime = 0;
    try {
      video.load();
    } catch {
      // The explicit entry button will retry playback.
    }
  }, []);

  return {
    firstVideoRef,
    secondVideoRef,
    phase,
    autoplayBlocked,
    firstVideoError,
    secondVideoError,
    setSecondVideoReady,
    secondVideoBuffering,
    firstEntryHotspotVisible,
    firstVideoSrc: useMobileVideos ? INTRO_VIDEO_ONE_MOBILE_SRC : INTRO_VIDEO_ONE_SRC,
    secondVideoSrc: useMobileVideos ? INTRO_VIDEO_TWO_MOBILE_SRC : INTRO_VIDEO_TWO_SRC,
    isPersian,
    beginCinematicReveal,
    handleSkipIntro,
    handleFirstVideoCanPlay,
    handleManualStart,
    handleFirstVideoEnded,
    handleFirstVideoProgress,
    handleEnterEloria,
    handleEmbeddedEntry,
    handleSecondVideoPlaying,
    handleSecondVideoWaiting,
    handleFirstVideoFailure,
    handleSecondVideoFailure,
    retryFirstVideo,
    retrySecondVideo,
  };
}

export type EloriaIntroController = ReturnType<typeof useEloriaIntroController>;
