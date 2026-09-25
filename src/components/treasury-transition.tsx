"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, useEffect, useRef, type ComponentProps, type ReactNode } from "react";

function ScrollToTopOnNavigation({ pathname }: { pathname: string }) {
  const previousPathname = useRef(pathname);
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    // Run after the new route is committed; override the site's smooth scroll.
    const frame = requestAnimationFrame(() => {
      const root = document.documentElement;
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      requestAnimationFrame(() => { root.style.scrollBehavior = previous; });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}

/** React owns the route commit and image readiness. No competing DOM snapshot,
 * pathname timer or forced skip while a destination is still loading. */
export function TreasuryPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
    <ScrollToTopOnNavigation pathname={pathname} />
    <ViewTransition
      key={pathname}
      name="eloria-page-content"
      default="none"
      enter={{
        "treasury-up": "eloria-page-up",
        "treasury-left": "eloria-page-forward",
        default: "none",
      }}
      exit={{
        "treasury-up": "eloria-page-up",
        "treasury-left": "eloria-page-forward",
        default: "none",
      }}
      share={{
        "treasury-up": "eloria-page-up",
        "treasury-left": "eloria-page-forward",
        default: "eloria-page-fade",
      }}
    >
      {children}
    </ViewTransition>
    </>
  );
}

export function TreasuryLink({
  direction = "left",
  ...props
}: ComponentProps<typeof Link> & {
  direction?: "left" | "up";
}) {
  return <Link {...props} transitionTypes={[`treasury-${direction}`]} />;
}
