/** Progress, not media events, determines whether playback is stuck. */
export function mountIntroWatchdog(
  video: Pick<HTMLVideoElement, "currentTime">,
  onStall: () => void,
  options: { now?: () => number; hidden?: () => boolean; stallMs?: number } = {},
) {
  const now = options.now ?? (() => performance.now());
  const hidden = options.hidden ?? (() => document.visibilityState === "hidden");
  let lastProgress = now();
  let lastTime = video.currentTime;
  let done = false;
  return () => {
    if (done) return;
    const current = now();
    if (hidden() || Math.abs(video.currentTime - lastTime) > 0.05) lastProgress = current;
    lastTime = video.currentTime;
    if (current - lastProgress >= (options.stallMs ?? 12000)) {
      done = true;
      onStall();
    }
  };
}
