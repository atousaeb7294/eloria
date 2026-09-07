"use client";

import type { MarketingAttribution } from "@/lib/marketing-attribution";
import { normalizeMarketingAttribution } from "@/lib/marketing-attribution";

const STORAGE_KEY = "eloria:marketing-attribution:v1";

export function captureMarketingAttributionFromLocation(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const explicit = normalizeMarketingAttribution({
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
    content: params.get("utm_content"),
  });
  if (!explicit) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(explicit));
  } catch {
    // Attribution is optional and must never block storefront behavior.
  }
}

export function getMarketingAttribution(): MarketingAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeMarketingAttribution(JSON.parse(raw));
  } catch {
    return null;
  }
}
