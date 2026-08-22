export const site_measurement_event_types = [
  "page_view",
  "view_item",
  "view_cart",
  "begin_checkout",
  "add_to_cart",
  "web_vital",
] as const;

export type SiteMeasurementEventType =
  (typeof site_measurement_event_types)[number];

export const site_measurement_metric_names = [
  "CLS",
  "FCP",
  "FID",
  "INP",
  "LCP",
  "TTFB",
] as const;

export type SiteMeasurementMetricName =
  (typeof site_measurement_metric_names)[number];

export type NormalizedSiteMeasurementEvent = {
  eventKey: string;
  eventType: SiteMeasurementEventType;
  locale: "fa" | "en";
  path: string;
  sessionId: string;
  productSlug: string | null;
  metricName: SiteMeasurementMetricName | null;
  metricValue: number | null;
  metricRating: "good" | "needs-improvement" | "poor" | null;
  navigationType: string | null;
  occurredAt: Date;
};

const eventKeyPattern = /^[a-z0-9_-]{16,160}$/i;
const sessionPattern = /^[a-z0-9_-]{16,80}$/i;
const slugPattern = /^[a-z0-9][a-z0-9-]{0,139}$/;

function text(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) return null;
  return normalized;
}

function validPath(value: unknown): string | null {
  const path = text(value, 240);
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("?") || path.includes("#") || /[\r\n]/.test(path)) return null;
  return path;
}

function validDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const now = Date.now();
  if (date.getTime() > now + 5 * 60_000) return null;
  if (date.getTime() < now - 31 * 24 * 60 * 60_000) return null;
  return date;
}

function optionalSlug(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const slug = text(value, 140)?.toLowerCase() ?? null;
  return slug && slugPattern.test(slug) ? slug : null;
}

export function isSiteMeasurementEnabled(): boolean {
  return process.env.ELORIA_MEASUREMENT_ENABLED?.trim().toLowerCase() === "true";
}

export function siteMeasurementRetentionDays(): number {
  const parsed = Number.parseInt(
    process.env.ELORIA_MEASUREMENT_RETENTION_DAYS?.trim() ?? "",
    10,
  );
  if (!Number.isFinite(parsed)) return 180;
  return Math.min(Math.max(parsed, 30), 730);
}

export function normalizeSiteMeasurementEvent(
  value: unknown,
  now = new Date(),
): NormalizedSiteMeasurementEvent | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const eventType = text(input.event_type, 40) as SiteMeasurementEventType | null;
  const eventKey = text(input.event_key, 160);
  const locale = text(input.locale, 10);
  const path = validPath(input.path);
  const sessionId = text(input.session_id, 80);
  const suppliedDate =
    input.occurred_at === undefined
      ? now
      : validDate(input.occurred_at);

  if (
    !eventType ||
    !site_measurement_event_types.includes(eventType) ||
    !eventKey ||
    !eventKeyPattern.test(eventKey) ||
    (locale !== "fa" && locale !== "en") ||
    !path ||
    !sessionId ||
    !sessionPattern.test(sessionId) ||
    !suppliedDate
  ) {
    return null;
  }

  const productSlug = optionalSlug(input.product_slug);
  if (input.product_slug && !productSlug) return null;

  if (eventType !== "web_vital") {
    return {
      eventKey,
      eventType,
      locale,
      path,
      sessionId,
      productSlug,
      metricName: null,
      metricValue: null,
      metricRating: null,
      navigationType: null,
      occurredAt: suppliedDate,
    };
  }

  const metricName = text(input.metric_name, 32) as SiteMeasurementMetricName | null;
  const metricValue = typeof input.metric_value === "number" ? input.metric_value : Number.NaN;
  const metricRating = text(input.metric_rating, 24);
  const navigationType = text(input.navigation_type, 32);

  if (
    !metricName ||
    !site_measurement_metric_names.includes(metricName) ||
    !Number.isFinite(metricValue) ||
    metricValue < 0 ||
    metricValue > 1_000_000 ||
    (metricRating !== "good" && metricRating !== "needs-improvement" && metricRating !== "poor") ||
    (input.navigation_type !== undefined && !navigationType)
  ) {
    return null;
  }

  return {
    eventKey,
    eventType,
    locale,
    path,
    sessionId,
    productSlug,
    metricName,
    metricValue,
    metricRating,
    navigationType,
    occurredAt: suppliedDate,
  };
}

export function measurementRouteEvent(path: string): Exclude<SiteMeasurementEventType, "web_vital"> {
  if (/^\/(fa|en)\/products\/[^/]+$/.test(path)) return "view_item";
  if (/^\/(fa|en)\/cart$/.test(path)) return "view_cart";
  if (/^\/(fa|en)\/checkout$/.test(path)) return "begin_checkout";
  return "page_view";
}
