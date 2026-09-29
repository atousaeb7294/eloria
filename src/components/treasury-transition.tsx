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
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-6 z-[10000] mx-auto w-fit rounded-2xl border border-[#ead3a0]/40 bg-[#062c20] px-6 py-3 text-center text-sm text-[#f8f0df] shadow-xl">
      <span lang="fa" dir="rtl">در حال بازکردن صفحه…</span>
      <span lang="en" className="ms-2 text-xs">Loading…</span>
    </div>,
    document.body,
  );
}

export function TreasuryLink({
  direction = "left",
  children,
  onNavigate,
  ...props
}: ComponentProps<typeof Link> & { direction?: "left" | "up" }) {
  return <Link
    {...props}
    data-navigation-direction={direction}
    prefetch={props.prefetch ?? true}
    transitionTypes={[]}
    onNavigate={(event) => {
      let cancelled = false;
      onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault(); } });
      if (!cancelled) window.dispatchEvent(new Event("eloria:navigate"));
    }}
  >
    {children}
    <NavigationStatus />
  </Link>;
}
