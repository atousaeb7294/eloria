type Carousel = {
  canScrollNext(): boolean;
  canScrollPrev(): boolean;
  scrollNext(jump?: boolean): void;
  scrollPrev(jump?: boolean): void;
  on(event: "settle", callback: () => void): unknown;
  off(event: "settle", callback: () => void): unknown;
};

/** Own only gestures over the carousel; never scroll the document ourselves. */
export function mountSalonWheel(element: HTMLElement, carousel: Carousel, options: {
  rtl: boolean; blocked: () => boolean; reducedMotion: () => boolean;
}) {
  let lastTime = -Infinity;
  let acceptedAt = -Infinity;
  let previousMagnitude = 0;
  let direction = 0;
  let accumulated = 0;
  let consumed = false;
  let moving = false;
  const settle = () => { moving = false; };
  const wheel = (event: WheelEvent) => {
    if (!event.cancelable || event.ctrlKey || event.metaKey || options.blocked() ||
      (event.target instanceof Element && event.target.closest(
        'input,textarea,select,[contenteditable="true"],[data-native-scroll]',
      ))) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const raw = horizontal ? event.deltaX * (options.rtl ? -1 : 1) : event.deltaY;
    if (!Number.isFinite(raw) || raw === 0) return;
    const delta = raw * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
    const now = performance.now();
    const gap = now - lastTime;
    const magnitude = Math.abs(delta);
    const nextDirection = Math.sign(delta);
    const reversed = direction !== 0 && nextDirection !== direction;
    // Distinguish deliberate mouse notches/renewed impulses from a decaying trackpad tail.
    const notch = event.deltaMode !== 0 || (Number.isInteger(raw) && Math.abs(raw) >= 40);
    const newImpulse = now - acceptedAt > 160 &&
      ((notch && gap >= 70) || (magnitude >= 24 && magnitude > previousMagnitude * 1.7));
    if (gap > 180 || reversed || newImpulse) { consumed = false; accumulated = 0; }
    lastTime = now;
    direction = nextDirection;
    previousMagnitude = magnitude;
    // A reversal can retarget immediately; repeated notches do not stack destinations.
    if (moving && !reversed && now - acceptedAt < 850) {
      event.preventDefault();
      return;
    }
    if (consumed) { event.preventDefault(); return; }
    const canMove = delta > 0 ? carousel.canScrollNext() : carousel.canScrollPrev();
    if (!canMove) return; // A fresh gesture at an edge belongs to the page.
    event.preventDefault();
    accumulated += magnitude;
    if (accumulated < 18) return;
    consumed = true;
    moving = true;
    acceptedAt = now;
    const jump = options.reducedMotion();
    if (delta > 0) carousel.scrollNext(jump);
    else carousel.scrollPrev(jump);
    if (jump) moving = false;
  };
  carousel.on("settle", settle);
  element.addEventListener("wheel", wheel, { passive: false });
  return () => {
    element.removeEventListener("wheel", wheel);
    carousel.off("settle", settle);
  };
}
