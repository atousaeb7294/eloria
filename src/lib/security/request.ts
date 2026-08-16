import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

type ProxyProvider =
  | "none"
  | "cloudflare"
  | "generic";

function proxyProvider(): ProxyProvider {
  if (process.env.ELORIA_TRUST_PROXY?.trim().toLowerCase() !== "true") {
    return "none";
  }

  const provider =
    process.env.ELORIA_PROXY_PROVIDER?.trim().toLowerCase();

  if (provider === "cloudflare") return "cloudflare";
  if (provider === "generic") return "generic";

  return "none";
}

function normalizeIp(value: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 80) return null;
  if (!/^[0-9a-fA-F:.,\s]+$/.test(normalized)) return null;
  return normalized;
}

export function requestIp(request: NextRequest): string {
  const provider = proxyProvider();

  if (provider === "cloudflare") {
    return normalizeIp(request.headers.get("cf-connecting-ip")) ?? "unknown";
  }

  if (provider === "generic") {
    const forwarded = request.headers.get("x-forwarded-for");
    return normalizeIp(forwarded?.split(",")[0] ?? null) ?? "unknown";
  }

  return "unknown";
}

export async function serverActionIp(): Promise<string> {
  const values = await headers();
  const provider = proxyProvider();

  if (provider === "cloudflare") {
    return normalizeIp(
      values.get("cf-connecting-ip"),
    ) ?? "unknown";
  }

  if (provider === "generic") {
    const forwarded =
      values.get("x-forwarded-for");

    return normalizeIp(
      forwarded?.split(",")[0] ?? null,
    ) ?? "unknown";
  }

  return "unknown";
}


function configuredSiteOrigin(): URL | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return null;

  try {
    const parsed = new URL(configured);
    if (
      process.env.NODE_ENV === "production" &&
      parsed.protocol !== "https:"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function explicitAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();
  const site = configuredSiteOrigin();

  if (site) {
    allowed.add(site.origin);
  }

  for (const raw of (process.env.ELORIA_ALLOWED_ORIGINS ?? "").split(",")) {
    const candidate = raw.trim();
    if (!candidate) continue;

    try {
      const url = new URL(candidate);
      if (
        process.env.NODE_ENV === "production" &&
        url.protocol !== "https:"
      ) {
        continue;
      }
      allowed.add(url.origin);
    } catch {
      // Invalid optional origin is ignored; env validation can report it separately.
    }
  }

  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://127.0.0.1:3000");
    allowed.add("http://localhost:3000");
  }

  return allowed;
}

function normalizedHost(value: string | null): string | null {
  const host = value?.trim().toLowerCase();
  if (!host || host.length > 255) return null;
  return host;
}

export function hasTrustedOrigin(request: NextRequest): boolean {
  const configuredSite = configuredSiteOrigin();
  const originHeader = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();

  if (originHeader) {
    try {
      const origin = new URL(originHeader).origin;
      return explicitAllowedOrigins().has(origin);
    } catch {
      return false;
    }
  }

  /*
   * Browser mutation requests normally carry Origin. For older clients where
   * Origin is absent, only same-origin fetches with a Host matching the
   * configured production hostname are accepted. request.nextUrl.origin is
   * deliberately NOT used as a trust anchor.
   */
  if (process.env.NODE_ENV === "production") {
    if (!configuredSite || fetchSite !== "same-origin") {
      return false;
    }

    const host = normalizedHost(request.headers.get("host"));
    return host === configuredSite.host.toLowerCase();
  }

  return fetchSite === "same-origin" || fetchSite === "none";
}

function fingerprintSecret(): string {
  const secret =
    process.env.ELORIA_CUSTOMER_AUTH_SECRET?.trim() ||
    process.env.ELORIA_ADMIN_SESSION_SECRET?.trim() ||
    "";

  if (secret.length >= 48) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("Request fingerprint secret is not configured.");
  }

  return "eloria-development-request-fingerprint-secret-not-for-production";
}

export function requestFingerprint(value: string): string {
  return createHmac("sha256", fingerprintSecret())
    .update(`request:${value}`)
    .digest("hex");
}
