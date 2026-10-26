"use client";

import Link, { useLinkStatus } from "next/link";
import { type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Route content must render without waiting for a view-transition snapshot.
// The independent 3D treasury-story controller remains unchanged.
export function TreasuryPageTransition({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function NavigationStatus() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return createPortal(
    <div role="status" aria-live="polite" className="eloria-navigation-status">
      <span className="sr-only">{document.documentElement.lang === "fa" ? "در حال بازکردن صفحه…" : "Opening page…"}</span>
      <span className="eloria-navigation-progress" aria-hidden="true" />
    </div>,
    document.body,
  );
}

export function TreasuryLink({
  direction = "left",
  showPending = true,
  children,
  onNavigate,
  ...props
}: ComponentProps<typeof Link> & { direction?: "left" | "up"; showPending?: boolean }) {
  return <Link
    {...props}
    data-navigation-direction={direction}
    prefetch={props.prefetch ?? null}
    transitionTypes={[]}
    onNavigate={(event) => {
      let cancelled = false;
      onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault(); } });
      if (!cancelled) window.dispatchEvent(new Event("eloria:navigate"));
    }}
  >
    {children}
    {showPending && <NavigationStatus />}
  </Link>;
}
