"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureMarketingAttributionFromLocation } from "@/lib/marketing-attribution-client";

export function MarketingAttributionTracker() {
  const pathname = usePathname();
  useEffect(() => {
    captureMarketingAttributionFromLocation();
  }, [pathname]);
  return null;
}
