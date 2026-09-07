export type MarketingAttribution = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
};

function normalizeAttributionValue(value: unknown, maximum = 160): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
  return normalized || null;
}

export function normalizeMarketingAttribution(value: unknown): MarketingAttribution | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const attribution: MarketingAttribution = {
    source: normalizeAttributionValue(input.source, 120),
    medium: normalizeAttributionValue(input.medium, 120),
    campaign: normalizeAttributionValue(input.campaign, 160),
    content: normalizeAttributionValue(input.content, 160),
  };
  return attribution.source || attribution.medium || attribution.campaign || attribution.content
    ? attribution
    : null;
}
