/** A decorative pointer follower. No React renders, layout reads or idle loop. */
export function mountCursorGlow() {
  const eligible = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 769px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let element: HTMLDivElement | null = null;
  let frame: number | null = null;
  let listening = false;
  let x = 0, y = 0, targetX = 0, targetY = 0;
  let visible = false;

  const stop = () => {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    visible = false;
    if (element) element.style.opacity = "0";
  };
  const paint = () => {
    frame = null;
    if (!element || !visible) return;
    const dx = targetX - x, dy = targetY - y;
    x += dx * 0.2;
    y += dy * 0.2;
    const settled = Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4;
    if (settled) { x = targetX; y = targetY; }
    element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    if (!settled) frame = window.requestAnimationFrame(paint);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || document.visibilityState === "hidden") return;
    if (!element) {
      element = document.createElement("div");
      element.className = "eloria-cursor-glow";
      element.setAttribute("aria-hidden", "true");
      // The body avoids transformed/paint-contained page wrappers clipping fixed UI.
      document.body.appendChild(element);
    }
    targetX = event.clientX;
    targetY = event.clientY;
    if (!visible) { x = targetX; y = targetY; }
    visible = true;
    element.style.opacity = "1";
    if (frame === null) frame = window.requestAnimationFrame(paint);
  };
  const visibility = () => { if (document.visibilityState === "hidden") stop(); };
  const sync = () => {
    const enabled = eligible.matches && !reduced.matches;
    if (enabled === listening) return;
    listening = enabled;
    if (enabled) window.addEventListener("pointermove", move, { passive: true });
    else {
      window.removeEventListener("pointermove", move);
      stop();
      element?.remove();
      element = null;
    }
  };
  eligible.addEventListener("change", sync);
  reduced.addEventListener("change", sync);
  window.addEventListener("blur", stop);
  document.documentElement.addEventListener("mouseleave", stop);
  document.addEventListener("visibilitychange", visibility);
  sync();
  return () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("blur", stop);
    document.documentElement.removeEventListener("mouseleave", stop);
    document.removeEventListener("visibilitychange", visibility);
    eligible.removeEventListener("change", sync);
    reduced.removeEventListener("change", sync);
    stop();
    element?.remove();
  };
}
