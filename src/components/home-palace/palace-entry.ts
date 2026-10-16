type Treasury = "gold" | "silver" | "weave";
let clearActiveFlight: (() => void) | undefined;

/** A short continuation of the clicked scene, independent of Next navigation.
 * No link interception, image wait, or timer that schedules router.push. */
export function startPalaceEntry(root: HTMLElement, slug: Treasury) {
  clearActiveFlight?.();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const compact = window.matchMedia("(max-width: 900px)").matches;
  const bay = root.querySelector<HTMLElement>(`[data-treasury="${slug}"]`);
  const scene = compact ? bay : root.querySelector<HTMLElement>(".ep-stage");
  if (!scene || !bay || typeof scene.cloneNode !== "function") return;
  const rect = scene.getBoundingClientRect();
  if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= window.innerHeight) return;
  const clone = scene.cloneNode(true) as HTMLElement;
  const flight = document.createElement("div");
  flight.className = "ep-surface ep-flight";
  flight.dir = "rtl";
  flight.inert = true;
  flight.setAttribute("aria-hidden", "true");
  flight.dataset.treasury = slug;
  flight.dataset.compact = String(compact);
  Object.assign(flight.style, {
    top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    transformOrigin: compact ? "76% 47%" : `${{ gold: 77, silver: 50, weave: 23 }[slug]}% 53%`,
  });
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
  clone.querySelectorAll("a").forEach(node => { node.removeAttribute("href"); node.tabIndex = -1; });
  if (compact) clone.dataset.open = "true";
  else clone.querySelectorAll<HTMLElement>("[data-treasury]").forEach(node => {
    node.dataset.open = String(node.dataset.treasury === slug);
  });
  flight.append(clone);
  document.body.append(flight);
  const clean = () => {
    flight.remove();
    clearTimeout(timer);
    window.removeEventListener("pagehide", clean);
    window.removeEventListener("popstate", clean);
    if (clearActiveFlight === clean) clearActiveFlight = undefined;
  };
  // Cleanup only; the native Next link does not wait for this timer.
  const timer = setTimeout(clean, 420);
  clearActiveFlight = clean;
  flight.addEventListener("animationend", event => {
    if (event.target === flight) clean();
  });
  window.addEventListener("pagehide", clean, { once: true });
  window.addEventListener("popstate", clean, { once: true });
}
