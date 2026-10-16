type Treasury = "gold" | "silver" | "weave";

/** Open the existing chest in place in the click event. React keeps this
 * attribute in sync until navigation settles; no snapshot, zoom or timer. */
export function startPalaceEntry(root: HTMLElement, slug: Treasury) {
  root.querySelectorAll<HTMLElement>("[data-treasury]").forEach(bay => {
    bay.dataset.open = String(bay.dataset.treasury === slug);
  });
}
