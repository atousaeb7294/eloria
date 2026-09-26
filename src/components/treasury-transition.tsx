"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, type ComponentProps, type ReactNode } from "react";

/** React owns the route commit and image readiness. No competing DOM snapshot,
 * pathname timer or forced skip while a destination is still loading. */
export function TreasuryPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
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
