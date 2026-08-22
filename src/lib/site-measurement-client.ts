"use client";

export type ClientMeasurementEvent = {
  event_type: "page_view" | "view_item" | "view_cart" | "begin_checkout" | "add_to_cart" | "web_vital";
  locale: "fa" | "en";
  path: string;
  product_slug?: string;
  metric_name?: "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";
  metric_value?: number;
  metric_rating?: "good" | "needs-improvement" | "poor";
  navigation_type?: string;
};

export const site_measurement_consent_key = "eloria:measurement-consent:v1";

type MeasurementConsent = "granted" | "denied";

function consent(): MeasurementConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(site_measurement_consent_key);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function measurementEnabled(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.eloriaMeasurement === "enabled";
}

function randomValue(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function sessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "eloria:measurement-session:v1";
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing && /^[a-z0-9_-]{16,80}$/i.test(existing)) return existing;
    const created = `${randomValue()}${randomValue()}`.slice(0, 48);
    window.sessionStorage.setItem(key, created);
    return created;
  } catch {
    return `${randomValue()}${randomValue()}`.slice(0, 48);
  }
}

function safePath(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("?") || value.includes("#")) return null;
  return value.length <= 240 ? value : null;
}

export function setSiteMeasurementConsent(value: MeasurementConsent): void {
  try {
    window.localStorage.setItem(site_measurement_consent_key, value);
  } catch {
    // Consent remains off if private storage is unavailable.
  }
  window.dispatchEvent(new Event("eloria:measurement-consent"));
}

export function getSiteMeasurementConsent(): MeasurementConsent | null {
  return consent();
}

export function recordClientMeasurement(event: ClientMeasurementEvent): void {
  if (!measurementEnabled() || consent() !== "granted") return;
  const path = safePath(event.path);
  const activeSession = sessionId();
  if (!path || !activeSession) return;

  const payload = JSON.stringify({
    ...event,
    path,
    event_key: `${randomValue()}${randomValue()}`.slice(0, 64),
    session_id: activeSession,
    occurred_at: new Date().toISOString(),
  });

  try {
    if (navigator.sendBeacon) {
      const accepted = navigator.sendBeacon(
        "/api/analytics/events",
        new Blob([payload], { type: "application/json" }),
      );
      if (accepted) return;
    }

    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Analytics must never affect shopping or rendering.
  }
}
