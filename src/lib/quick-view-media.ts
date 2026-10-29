import { localMediaLoader } from "./local-media-loader";

export const QUICK_VIEW_SIZES = "(max-width:760px) calc(90vw - 32px), 450px";
type Display = { viewport: number; dpr: number; saveData?: boolean; effectiveType?: string };

/** Match the visible dialog, not the resolution of the uploaded original. */
export function quickViewMediaSource(src: string, display: Display): string | null {
  const loader = localMediaLoader(src);
  if (!loader) return null;
  const mobile = display.viewport <= 760;
  const frame = mobile ? display.viewport * .9 - 32 : Math.min(450, (display.viewport * .9 - 58) / 2);
  const slow = display.saveData || /^(slow-2g|2g|3g)$/.test(display.effectiveType ?? "");
  const cap = slow ? 640 : mobile ? 800 : 960;
  const width = Math.max(320, Math.min(cap, frame * Math.min(2, Math.max(1, display.dpr))));
  return loader({ src, width });
}

export function currentQuickViewSource(src: string): string | null {
  if (typeof window === "undefined") return quickViewMediaSource(src, { viewport: 390, dpr: 1 });
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return quickViewMediaSource(src, {
    viewport: window.innerWidth, dpr: window.devicePixelRatio || 1,
    saveData: connection?.saveData, effectiveType: connection?.effectiveType,
  });
}

/** Reuse the loaded image of this product, including a prepared transparent one. */
export function loadedCardPreview(trigger: HTMLElement): string | undefined {
  const photo = trigger.closest(".product-card")?.querySelector<HTMLImageElement>(".product-photo img");
  const src = photo?.currentSrc || photo?.src;
  return photo?.complete && photo.naturalWidth > 0 && src && !src.includes("eloria-logo") ? src : undefined;
}

const warmed = new Map<string, HTMLImageElement>();
let inFlight = 0;

/** Only pointer/keyboard intent warms a photo; never prefetch the whole edit. */
export function warmQuickView(src: string) {
  if (typeof window === "undefined") return;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || /^(slow-2g|2g|3g)$/.test(connection?.effectiveType ?? "")) return;
  const url = currentQuickViewSource(src);
  if (!url || warmed.has(url) || inFlight >= 2) return;
  const image = new window.Image();
  warmed.set(url, image);
  inFlight++;
  let settled = false;
  const finish = (failed: boolean) => {
    if (settled) return;
    settled = true;
    inFlight--;
    if (failed) warmed.delete(url);
    while (warmed.size > 12) warmed.delete(warmed.keys().next().value!);
  };
  image.onload = () => finish(false);
  image.onerror = () => finish(true);
  image.decoding = "async";
  image.fetchPriority = "low";
  image.src = url;
}
