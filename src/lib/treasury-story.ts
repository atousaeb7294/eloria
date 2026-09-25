/** One scroll owner, one sticky viewport, at most two painted chapters.
 * No scroll-height measurements are taken from transformed or sticky children.
 * Animation frames exist only while the user is moving between chapters. */
export const storyClamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

export function storyFrame(progress: number, index: number, compact = false) {
  const base = Math.floor(progress);
  const fraction = progress - base;
  if (index !== base && index !== base + 1)
    return { visible: false, transform: "none", opacity: "0" };
  const depth = compact ? 0.45 : 1;
  if (index === base)
    return {
      visible: true,
      transform: [
        `translate3d(${-18 * fraction}%,0,${-180 * fraction * depth}px) rotateY(${10 * fraction * depth}deg) scale(${1 - 0.035 * fraction})`,
        `translate3d(0,${-14 * fraction}%,${-240 * fraction * depth}px) rotateX(${-13 * fraction * depth}deg) scale(${1 - 0.055 * fraction})`,
        `translate3d(${20 * fraction}%,${-4 * fraction}%,${-190 * fraction * depth}px) rotateY(${16 * fraction * depth}deg) scale(${1 - 0.04 * fraction})`,
        `translate3d(0,${8 * fraction}%,${-120 * fraction * depth}px) rotateX(${8 * fraction * depth}deg)`,
      ][index] ?? "none",
      opacity: "1",
    };
  const remaining = 1 - fraction;
  const lift = Math.sin(Math.PI * fraction);
  const transforms = [
    "none",
    `translate3d(0,${100 * remaining}%,${(-190 * remaining + 65 * lift) * depth}px) rotateX(${20 * remaining * depth}deg) scale(${1 - 0.055 * remaining})`,
    `translate3d(${105 * remaining}%,${6 * remaining - 7 * lift * depth}%,${(-250 * remaining + 80 * lift) * depth}px) rotateY(${-22 * remaining * depth}deg) scale(${1 - 0.045 * remaining})`,
    `translate3d(${-105 * remaining}%,${18 * remaining - 5 * lift * depth}%,${(-180 * remaining + 70 * lift) * depth}px) rotateX(${-14 * remaining * depth}deg) rotateZ(${-5 * remaining * depth}deg) scale(${1 - 0.055 * remaining})`,
  ];
  return {
    visible: fraction > 0,
    transform: transforms[index] ?? transforms[1],
    opacity: "1",
  };
}

/** A wheel gesture is one chapter, including the inertial tail of a trackpad. */
export function createStoryGesture() {
  let lastTime = -Infinity;
  let direction = 0;
  let consumed = false;
  let total = 0;
  let acceptedAt = -Infinity;
  return (delta: number, time: number) => {
    const nextDirection = Math.sign(delta);
    if (!nextDirection) return 0;
    const deliberateNotch = Number.isInteger(delta) && Math.abs(delta) >= 40 &&
      time - lastTime >= 70 && time - acceptedAt >= 360;
    if (time - lastTime > 180 || nextDirection !== direction || deliberateNotch) {
      consumed = false;
      total = 0;
    }
    direction = nextDirection;
    lastTime = time;
    total += Math.abs(delta);
    if (consumed || total < 14) return 0;
    consumed = true;
    acceptedAt = time;
    return direction;
  };
}

export function mountTreasuryStory(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>(".eloria-promenade-stage");
  const chapters = Array.from(
    root.querySelectorAll<HTMLElement>("[data-promenade-chapter]"),
  );
  if (!stage || chapters.length < 2) return () => {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const small = matchMedia("(max-height: 520px)");
  const dots = Array.from(
    root.querySelectorAll<HTMLElement>("[data-story-go]"),
  );
  let enabled = false;
  let top = 0;
  let height = 1;
  let animationFrame = 0;
  let paintFrame = 0;
  let settleTimer = 0;
  let moving = false;
  let compositorAnimations: Animation[] = [];
  let animationFrom = 0;
  let animationTo = 0;
  let run = 0;
  let visualProgress: number | null = null;
  let lastPainted = -1;
  let compact = window.innerWidth < 700;
  let measuredWidth = 0;
  let touching = false;
  let destination = 0;
  let lastY = window.scrollY;
  let direction = 1;
  let active = -1;
  const consumeGesture = createStoryGesture();
  const last = chapters.length - 1;

  function currentProgress() {
    const timing = compositorAnimations[0]?.effect?.getComputedTiming();
    if (typeof timing?.progress === "number")
      return animationFrom + (animationTo - animationFrom) * timing.progress;
    return visualProgress ?? (window.scrollY - top) / height;
  }

  function blocked(target?: EventTarget | null) {
    return (
      !!document.querySelector(
        '.eloria-intro-root, dialog[open], [aria-modal="true"]',
      ) ||
      (target instanceof Element &&
        !!target.closest(
          "input, textarea, select, [contenteditable=true], [data-native-scroll]",
        ))
    );
  }
  function stop(syncScroll = false) {
    const progress = currentProgress();
    run++;
    cancelAnimationFrame(animationFrame);
    cancelAnimationFrame(paintFrame);
    paintFrame = 0;
    clearTimeout(settleTimer);
    if (syncScroll && moving) {
      window.scrollTo({ top: top + progress * height, behavior: "instant" });
      lastY = window.scrollY;
    }
    compositorAnimations.forEach((animation) => animation.cancel());
    compositorAnimations = [];
    visualProgress = null;
    moving = false;
    root.removeAttribute("data-story-moving");
  }
  function paint(progress = storyClamp((window.scrollY - top) / height, 0, last)) {
    if (!enabled) return;
    if (progress === lastPainted) return;
    lastPainted = progress;
    const nextActive = Math.round(progress);
    chapters.forEach((chapter, index) => {
      const frame = storyFrame(progress, index, compact);
      chapter.style.visibility = frame.visible ? "visible" : "hidden";
      chapter.style.transform = frame.transform;
      chapter.style.opacity = frame.opacity;
      chapter.style.willChange =
        frame.visible && progress % 1 > 0.001 ? "transform" : "auto";
      if (active !== nextActive) {
        chapter.inert = index !== nextActive;
        chapter.setAttribute("aria-hidden", String(index !== nextActive));
      }
    });
    if (active !== nextActive) {
      active = nextActive;
      root.dataset.storyChapter = String(active);
      dots.forEach((dot) =>
        dot.setAttribute(
          "aria-current",
          Number(dot.dataset.storyGo) === active ? "step" : "false",
        ),
      );
    }
  }
  function measure() {
    const nextEnabled = !reduced.matches && !small.matches;
    if (nextEnabled === enabled && measuredWidth === window.innerWidth &&
        height === stage!.clientHeight) return;
    stop(true);
    enabled = nextEnabled;
    compact = window.innerWidth < 700;
    measuredWidth = window.innerWidth;
    lastPainted = -1;
    active = -1;
    root.toggleAttribute("data-story-enhanced", enabled);
    if (enabled) {
      top = root.getBoundingClientRect().top + window.scrollY;
      height = Math.max(1, stage!.clientHeight);
      paint();
    } else {
      chapters.forEach((chapter) => {
        chapter.style.removeProperty("transform");
        chapter.style.removeProperty("visibility");
        chapter.style.removeProperty("opacity");
        chapter.style.removeProperty("will-change");
        chapter.inert = false;
        chapter.removeAttribute("aria-hidden");
      });
    }
  }
  function go(index: number, focus = false) {
    if (!enabled) return;
    stop(true);
    destination = storyClamp(index, 0, chapters.length);
    const from = window.scrollY;
    const to = Math.min(
      top + destination * height,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    if (Math.abs(to - from) < 1) {
      paint();
      return;
    }
    if (destination > last) {
      // Only leaving the story scrolls the document during the animation.
      window.scrollTo({ top: to, behavior: "smooth" });
      return;
    }
    const start = performance.now();
    const fromProgress = storyClamp((from - top) / height, 0, last);
    const toProgress = storyClamp((to - top) / height, 0, last);
    const duration = 680 * Math.max(1, Math.abs(toProgress - fromProgress));
    moving = true;
    visualProgress = fromProgress;
    root.dataset.storyMoving = "true";
    const finish = () => {
      window.scrollTo({ top: to, behavior: "instant" });
      lastY = window.scrollY;
      paint(toProgress);
      const completed = compositorAnimations;
      compositorAnimations = [];
      completed.forEach((animation) => animation.cancel());
      visualProgress = null;
      moving = false;
      root.removeAttribute("data-story-moving");
      if (focus && destination <= last)
        chapters[destination].focus({ preventScroll: true });
    };
    const lower = Math.floor(Math.min(fromProgress, toProgress) + 0.000001);
    const upper = Math.ceil(Math.max(fromProgress, toProgress) - 0.000001);
    if (upper - lower === 1 && typeof chapters[lower].animate === "function") {
      // Adjacent scenes animate on the browser compositor, not in a JS RAF loop.
      animationFrom = fromProgress;
      animationTo = toProgress;
      const token = run;
      compositorAnimations = [lower, upper].map((index) => {
        const chapter = chapters[index];
        chapter.style.visibility = "visible";
        chapter.style.opacity = "1";
        chapter.style.willChange = "transform";
        const keyframes = Array.from({ length: 31 }, (_, sample) => {
          const offset = sample / 30;
          const progress = storyClamp(
            fromProgress + (toProgress - fromProgress) * offset,
            lower + 0.000001, upper - 0.000001,
          );
          return { offset, transform: storyFrame(progress, index, compact).transform };
        });
        return chapter.animate(keyframes, {
          duration, easing: "cubic-bezier(.22,.7,.18,1)", fill: "both",
        });
      });
      void Promise.all(compositorAnimations.map((animation) => animation.finished))
        .then(() => { if (run === token) finish(); })
        .catch(() => { /* Native scroll, reset or unmount cancels this run. */ });
      return;
    }
    const tick = (time: number) => {
      const t = Math.min(1, (time - start) / duration);
      // One render loop; scrolling the document every frame also triggered
      // scroll listeners and a second paint loop in the old controller.
      const eased = (1 - Math.cos(Math.PI * t)) / 2;
      visualProgress = fromProgress + (toProgress - fromProgress) * eased;
      paint(visualProgress);
      if (t < 1) animationFrame = requestAnimationFrame(tick);
      else {
        finish();
      }
    };
    animationFrame = requestAnimationFrame(tick);
  }
  function settle() {
    if (!enabled || moving || touching || blocked()) return;
    const p = (window.scrollY - top) / height;
    if (p <= 0 || p >= last) return;
    const target = direction > 0 ? Math.ceil(p - 0.025) : Math.floor(p + 0.025);
    go(target);
  }
  function onScroll() {
    if (moving && window.scrollY === lastY) return;
    if (moving) stop(); // Native scrolling/scrollbar takes ownership immediately.
    if (window.scrollY !== lastY) direction = Math.sign(window.scrollY - lastY);
    lastY = window.scrollY;
    if (!paintFrame) paintFrame = requestAnimationFrame(() => {
      paintFrame = 0;
      paint();
    });
    clearTimeout(settleTimer);
    if (!moving) settleTimer = window.setTimeout(settle, 140);
  }
  function wheel(event: WheelEvent) {
    if (
      !enabled ||
      blocked(event.target) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
    )
      return;
    const p = currentProgress();
    if (p < -0.01 || p > last + 0.01 || (p <= 0 && event.deltaY < 0)) return;
    // The footer is ordinary document flow, never an extra hidden chapter.
    if (moving && destination > last) return;
    const step = consumeGesture(
      event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1),
      performance.now(),
    );
    event.preventDefault();
    if (!step) return;
    const current = moving ? destination : Math.round(p);
    if (
      moving &&
      step === Math.sign(destination - p)
    )
      return;
    go(current + step);
  }
  function click(event: MouseEvent) {
    if (
      !enabled ||
      !(event.target instanceof Element) ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    const link = event.target.closest<HTMLAnchorElement>("a[href^='#']");
    if (!link) return;
    const hash = link.getAttribute("href")?.slice(1);
    const index =
      hash === "promenade-end"
        ? chapters.length
        : chapters.findIndex((chapter) => chapter.id === hash);
    if (index < 0) return;
    event.preventDefault();
    go(index, event.detail === 0);
  }
  function keydown(event: KeyboardEvent) {
    if (
      !enabled ||
      blocked(event.target) ||
      event.altKey ||
      event.metaKey ||
      event.ctrlKey ||
      (event.target instanceof Element &&
        event.target.closest("button, a, [role=button]"))
    )
      return;
    const p = (window.scrollY - top) / height;
    if (p < 0 || p > last + 0.01) return;
    const delta =
      event.key === "ArrowDown" ||
      event.key === "PageDown" ||
      (event.key === " " && !event.shiftKey)
        ? 1
        : event.key === "ArrowUp" ||
            event.key === "PageUp" ||
            (event.key === " " && event.shiftKey)
          ? -1
          : 0;
    if (!delta || event.repeat || (p === 0 && delta < 0)) return;
    event.preventDefault();
    go((moving ? destination : Math.round(p)) + delta, true);
  }
  const onTouchStart = () => {
    touching = true;
    stop(true);
  };
  const onTouchEnd = () => {
    touching = false;
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, 160);
  };
  const resetHome = () => {
    stop();
    destination = 0;
    lastY = 0;
    direction = 1;
    touching = false;
    lastPainted = -1;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    paint(0);
  };
  const resize = new ResizeObserver(measure);
  resize.observe(stage);
  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("keydown", keydown);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });
  window.addEventListener("eloria:reset-home", resetHome);
  root.addEventListener("click", click);
  reduced.addEventListener("change", measure);
  small.addEventListener("change", measure);
  return () => {
    stop();
    cancelAnimationFrame(paintFrame);
    resize.disconnect();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("wheel", wheel);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
    window.removeEventListener("eloria:reset-home", resetHome);
    root.removeEventListener("click", click);
    reduced.removeEventListener("change", measure);
    small.removeEventListener("change", measure);
    root.removeAttribute("data-story-enhanced");
    chapters.forEach((chapter) => {
      chapter.inert = false;
      chapter.removeAttribute("aria-hidden");
      for (const property of ["transform", "visibility", "opacity", "will-change"])
        chapter.style.removeProperty(property);
    });
  };
}
