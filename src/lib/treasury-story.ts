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
    const progress = storyClamp((window.scrollY - top) / height, 0, last);
    if (progress === lastProgress) return;
    lastProgress = progress;
    const nextActive = Math.round(progress);
    chapters.forEach((chapter, index) => {
      const next = storyFrame(progress, index, compact);
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
    focusDestination = event.detail === 0 && index <= last ? index : null;
    // Browser owns the entire movement; wheel/touch can interrupt it naturally.
    window.scrollTo({ top: top + index * height, behavior: "smooth" });
  };
  const reset = () => {
    focusDestination = null;
    lastProgress = -1;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    schedulePaint();
  };
  const resize = new ResizeObserver(measure);
  resize.observe(stage);
  measure();
  window.addEventListener("scroll", schedulePaint, { passive: true });
  window.addEventListener("eloria:reset-home", reset);
  root.addEventListener("click", click);
  reduced.addEventListener("change", measure);
  small.addEventListener("change", measure);
  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    window.removeEventListener("scroll", schedulePaint);
    window.removeEventListener("eloria:reset-home", reset);
    root.removeEventListener("click", click);
    reduced.removeEventListener("change", measure);
    small.removeEventListener("change", measure);
    root.removeAttribute("data-story-enhanced");
    root.removeAttribute("data-story-moving");
    clearChapters();
  };
}
