"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function NavigationAccelerator({ locale }: { locale: string }) {
  const router = useRouter();

  useEffect(() => {
    const safeLocale = locale === "en" ? "en" : "fa";
    const commonRoutes = [
      `/${safeLocale}/products`,
      `/${safeLocale}/collections`,
      `/${safeLocale}/contact`,
      `/${safeLocale}/cart`,
      `/${safeLocale}/checkout`,
    ];
    let cancelled = false;
    const prefetched = new Set<string>();

    const prefetch = (href: string) => {
      if (
        cancelled ||
        prefetched.has(href) ||
        !href.startsWith("/") ||
        href.startsWith("//") ||
        href.startsWith("/api/") ||
        href.startsWith("/#")
      ) return;

      prefetched.add(href);
      router.prefetch(href);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let idleId: number | null = null;
    let timerId: number | null = null;
    const warmCommonRoutes = () => {
      if (!cancelled) commonRoutes.forEach(prefetch);
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(warmCommonRoutes, { timeout: 1200 });
    } else {
      timerId = window.setTimeout(warmCommonRoutes, 300);
    }

    const extractInternalHref = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return null;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return null;

      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin || url.hash && url.pathname === window.location.pathname) return null;
        return `${url.pathname}${url.search}`;
      } catch {
        return null;
      }
    };

    const warmFromEvent = (event: Event) => {
      const href = extractInternalHref(event.target);
      if (href) prefetch(href);
    };

    document.addEventListener("pointerover", warmFromEvent, { passive: true, capture: true });
    document.addEventListener("pointerdown", warmFromEvent, { passive: true, capture: true });
    document.addEventListener("focusin", warmFromEvent, { capture: true });

    return () => {
      cancelled = true;
      document.removeEventListener("pointerover", warmFromEvent, true);
      document.removeEventListener("pointerdown", warmFromEvent, true);
      document.removeEventListener("focusin", warmFromEvent, true);
      if (idleId !== null && idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [locale, router]);

  return null;
}
