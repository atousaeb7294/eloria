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
  const depth = compact ? 0.22 : 0.65;
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
  const chapters = Array.from(root.querySelectorAll<HTMLElement>("[data-promenade-chapter]"));
  if (!stage || chapters.length < 2) return () => {};
  const dots = Array.from(root.querySelectorAll<HTMLElement>("[data-story-go]"));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const small = matchMedia("(max-height: 520px)");
  let enabled = false;
  let top = 0;
  let height = 1;
  let compact = false;
  let frame = 0;
  let lastProgress = -1;
  let active = -1;
  let focusDestination: number | null = null;
  const last = chapters.length - 1;
  let motion: { from: number; to: number; started: number; duration: number } | null = null;
  let writtenY: number | null = null;
  let gesture = createStoryGesture();
  let touch: { x: number; y: number; direction: number; resume: number | null } | null = null;
  const excluded = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    if (target.closest("input, textarea, select, button, [contenteditable], [role='dialog'], dialog, [data-story-native-scroll], [data-native-scroll]")) return true;
    for (let node: Element | null = target; node && node !== root; node = node.parentElement) {
      if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) return true;
    }
    return false;
  };
  const stop = () => { motion = null; writtenY = null; };
  const go = (index: number) => {
    const to = top + index * height;
    if (Math.abs(window.scrollY - to) < 1) return;
    writtenY = window.scrollY;
    motion = { from: window.scrollY, to, started: performance.now(), duration: compact ? 400 : 480 };
    focusDestination = null;
    schedulePaint();
  };
  const destination = (direction: number) => {
    const progress = (window.scrollY - top) / height;
    if (progress < -0.002 || progress > last + 0.002) return null;
    const nearest = Math.round(progress);
    const index = Math.abs(progress - nearest) < 0.002 ? nearest + direction :
      direction > 0 ? Math.ceil(progress) : Math.floor(progress);
    return index >= 0 && index <= last ? index : null;
  };
  const wheel = (event: WheelEvent) => {
    if (!enabled || event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey ||
      excluded(event.target) || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
    const direction = Math.sign(delta);
    if (!direction) return;
    const index = destination(direction);
    if (index === null && !motion) return;
    event.preventDefault();
    // Do not consume the next deliberate gesture while the current move finishes.
    if (motion && Math.sign(motion.to - window.scrollY) === direction) return;
    const accepted = gesture(delta, performance.now());
    if (accepted && index !== null) go(index);
  };
  const touchStart = (event: TouchEvent) => {
    if (!enabled || excluded(event.target) || event.touches.length !== 1) { touch = null; return; }
    const resume = motion ? Math.round((motion.to - top) / height) : null;
    stop();
    const point = event.touches[0];
    touch = { x: point.clientX, y: point.clientY, direction: 0, resume };
  };
  const touchMove = (event: TouchEvent) => {
    if (!touch || event.touches.length !== 1 || !event.cancelable) { touch = null; return; }
    const point = event.touches[0];
    const delta = touch.y - point.clientY;
    if (Math.abs(point.clientX - touch.x) > Math.abs(delta)) { touch = null; return; }
    if (Math.abs(delta) < 3) return;
    const direction = Math.sign(delta);
    if (destination(direction) === null) { touch = null; return; }
    event.preventDefault();
    touch.direction = Math.abs(delta) >= 24 ? direction : 0;
  };
  const touchEnd = () => {
    if (touch?.direction) {
      const index = destination(touch.direction);
      if (index !== null) go(index);
    } else if (touch?.resume !== null && touch?.resume !== undefined) go(touch.resume);
    touch = null;
  };
  const touchCancel = () => {
    // A system gesture can cancel touch delivery after interrupting an animation.
    const resume = touch?.resume;
    touch = null;
    if (resume !== null && resume !== undefined) go(resume);
  };
  const navigating = () => {
    stop();
    touch = null;
    focusDestination = null;
  };
  const keydown = (event: KeyboardEvent) => {
    if (!enabled || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || excluded(event.target)) return;
    const direction = ["ArrowDown", "PageDown"].includes(event.key) || (event.key === " " && !event.shiftKey) ? 1 :
      ["ArrowUp", "PageUp"].includes(event.key) || (event.key === " " && event.shiftKey) ? -1 : 0;
    if (!direction) { if (["Home", "End", "Escape"].includes(event.key)) stop(); return; }
    const index = destination(direction);
    if (index === null) return;
    event.preventDefault();
    if (!motion || Math.sign(motion.to - window.scrollY) !== direction) go(index);
  };
  const scroll = () => {
    // Scrollbar, assistive navigation and unrelated scroll owners may interrupt.
    if (motion && writtenY !== null && Math.abs(window.scrollY - writtenY) > 3) stop();
    schedulePaint();
  };
  const clearChapters = () => {
    for (const chapter of chapters) {
      chapter.inert = false;
      chapter.removeAttribute("aria-hidden");
      for (const property of ["transform", "visibility", "opacity", "will-change"])
        chapter.style.removeProperty(property);
    }
  };
  const paint = () => {
    frame = 0;
    if (!enabled) return;
    if (motion) {
      const elapsed = storyClamp((performance.now() - motion.started) / motion.duration, 0, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      writtenY = motion.from + (motion.to - motion.from) * eased;
      window.scrollTo({ top: writtenY, behavior: "instant" });
      if (elapsed === 1) stop(); else schedulePaint();
    }
    const progress = storyClamp((window.scrollY - top) / height, 0, last);
    if (progress === lastProgress) return;
    lastProgress = progress;
    const nextActive = Math.round(progress);
    chapters.forEach((chapter, index) => {
      const next = storyFrame(progress, index, compact);
      // Hidden, already-cleared scenes do not need repeated style writes.
      if (!next.visible && chapter.style.visibility === "hidden") {
        if (nextActive !== active) {
          chapter.inert = index !== nextActive;
          chapter.setAttribute("aria-hidden", String(index !== nextActive));
        }
        return;
      }
      chapter.style.visibility = next.visible ? "visible" : "hidden";
      chapter.style.transform = next.transform;
      chapter.style.opacity = next.opacity;
      chapter.style.willChange = next.visible && progress % 1 > 0.001 ? "transform" : "auto";
      if (nextActive !== active) {
        chapter.inert = index !== nextActive;
        chapter.setAttribute("aria-hidden", String(index !== nextActive));
      }
    });
    if (nextActive !== active) {
      active = nextActive;
      root.dataset.storyChapter = String(active);
      dots.forEach(dot => dot.setAttribute("aria-current", Number(dot.dataset.storyGo) === active ? "step" : "false"));
    }
    if (focusDestination !== null && Math.abs(progress - focusDestination) < 0.01) {
      chapters[focusDestination]?.focus({ preventScroll: true });
      focusDestination = null;
    }
  };
  const schedulePaint = () => { if (!frame) frame = requestAnimationFrame(paint); };
  const measure = () => {
    stop();
    touch = null;
    gesture = createStoryGesture();
    enabled = !reduced.matches && !small.matches;
    root.toggleAttribute("data-story-enhanced", enabled);
    root.removeAttribute("data-story-moving");
    top = root.getBoundingClientRect().top + window.scrollY;
    height = Math.max(1, stage.clientHeight);
    compact = window.innerWidth < 700;
    lastProgress = -1;
    active = -1;
    if (enabled) schedulePaint(); else clearChapters();
  };
  const click = (event: MouseEvent) => {
    if (!enabled || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey ||
      event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>("a[href^='#']");
    if (!link) return;
    const hash = link.getAttribute("href")?.slice(1);
    const index = hash === "promenade-end" ? chapters.length : chapters.findIndex(chapter => chapter.id === hash);
    if (index < 0) return;
    event.preventDefault();
    go(index);
    focusDestination = event.detail === 0 && index <= last ? index : null;
  };
  const reset = () => {
    stop();
    touch = null;
    gesture = createStoryGesture();
    focusDestination = null;
    lastProgress = -1;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    schedulePaint();
  };
  const resize = new ResizeObserver(measure);
  resize.observe(stage);
  measure();
  window.addEventListener("scroll", scroll, { passive: true });
  root.addEventListener("wheel", wheel, { passive: false });
  root.addEventListener("touchstart", touchStart, { passive: true });
  root.addEventListener("touchmove", touchMove, { passive: false });
  root.addEventListener("touchend", touchEnd, { passive: true });
  root.addEventListener("touchcancel", touchCancel, { passive: true });
  window.addEventListener("keydown", keydown);
  window.addEventListener("eloria:reset-home", reset);
  window.addEventListener("eloria:navigate", navigating);
  root.addEventListener("click", click);
  reduced.addEventListener("change", measure);
  small.addEventListener("change", measure);
  return () => {
    stop();
    cancelAnimationFrame(frame);
    resize.disconnect();
    window.removeEventListener("scroll", scroll);
    root.removeEventListener("wheel", wheel);
    root.removeEventListener("touchstart", touchStart);
    root.removeEventListener("touchmove", touchMove);
    root.removeEventListener("touchend", touchEnd);
    root.removeEventListener("touchcancel", touchCancel);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("eloria:reset-home", reset);
    window.removeEventListener("eloria:navigate", navigating);
    root.removeEventListener("click", click);
    reduced.removeEventListener("change", measure);
    small.removeEventListener("change", measure);
    root.removeAttribute("data-story-enhanced");
    root.removeAttribute("data-story-moving");
    clearChapters();
  };
}
