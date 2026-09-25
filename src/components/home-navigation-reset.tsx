"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

/** Lives in the persistent layout, including while a product page is open. */
export function HomeNavigationReset() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    let frame = 0;
    const isHome = () => /^\/(?:fa|en)?\/?$/.test(window.location.pathname);
    const reset = () => {
      if (!isHome()) return;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      window.dispatchEvent(new Event("eloria:reset-home"));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      reset();
      // Next/router and the browser can restore their scroll position on commit.
      frame = requestAnimationFrame(() => {
        reset();
        frame = requestAnimationFrame(reset);
      });
    };
    const pageShow = (event: PageTransitionEvent) => {
      if (event.persisted) schedule();
    };
    const hash = window.location.hash;
    if (!hash || hash === "#hero" || hash === "#promenade-intro") schedule();
    window.addEventListener("popstate", schedule);
    window.addEventListener("pageshow", pageShow);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("pageshow", pageShow);
    };
  }, [pathname]);
  return null;
}
