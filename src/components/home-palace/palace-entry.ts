import type { Treasury } from "./palace-products";

// Unlock, rotate around the fixed rear hinge, settle, then navigate.
export const PALACE_OPENING_MS = 780;

/** Paint the open state in the same event that starts the hinged lid. */
export function startPalaceEntry(root: HTMLElement, slug: Treasury) {
  root.querySelectorAll<HTMLElement>("[data-treasury]").forEach(bay => {
    bay.dataset.open = String(bay.dataset.treasury === slug);
  });
}
