import type { Treasury } from "./palace-products";

// Kept in sync with the --ep-opening-ms value supplied by HomePalace.
export const PALACE_OPENING_MS = 520;

/** Paint the open state in the same event that starts the hinged lid. */
export function startPalaceEntry(root: HTMLElement, slug: Treasury) {
  root.querySelectorAll<HTMLElement>("[data-treasury]").forEach(bay => {
    bay.dataset.open = String(bay.dataset.treasury === slug);
  });
}
