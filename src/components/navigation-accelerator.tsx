"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function NavigationAccelerator() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const prefetched = new Map<string, number>();

    const prefetch = (href: string) => {
      if (
        cancelled ||
        Date.now() - (prefetched.get(href) ?? 0) < 30_000 ||
        !/^\/(?:fa|en)\/(?:products|collections|login|story|about|atelier|journal|contact)(?:\/|\?|$)/.test(href)
      )
        return;

      const connection = (
        navigator as Navigator & {
          connection?: { saveData?: boolean; effectiveType?: string };
        }
      ).connection;
      if (
        connection?.saveData ||
        /(^|-)2g$/.test(connection?.effectiveType ?? "")
      )
        return;
      if (prefetched.size >= 100)
        prefetched.delete(prefetched.keys().next().value!);
      prefetched.set(href, Date.now());
      router.prefetch(href);
    };

    const extractInternalHref = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return null;
      if (
        (anchor.target && anchor.target !== "_self") ||
        anchor.hasAttribute("download")
      )
        return null;

      try {
        const url = new URL(anchor.href, window.location.origin);
        if (
          url.origin !== window.location.origin ||
          (url.hash && url.pathname === window.location.pathname)
        )
          return null;
        return `${url.pathname}${url.search}`;
      } catch {
        return null;
      }
    };

    const warmFromEvent = (event: Event) => {
      const href = extractInternalHref(event.target);
      if (href) prefetch(href);
    };

    document.addEventListener("pointerover", warmFromEvent, {
      passive: true,
      capture: true,
    });
    document.addEventListener("pointerdown", warmFromEvent, {
      passive: true,
      capture: true,
    });
    document.addEventListener("focusin", warmFromEvent, { capture: true });

    return () => {
      cancelled = true;
      document.removeEventListener("pointerover", warmFromEvent, true);
      document.removeEventListener("pointerdown", warmFromEvent, true);
      document.removeEventListener("focusin", warmFromEvent, true);
    };
  }, [router]);

  return null;
}
