import { isIP } from "node:net";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

type ProxyProvider = "none" | "cloudflare" | "generic";

function proxyProvider(): ProxyProvider {
  if (
    process.env.ELORIA_TRUST_PROXY !== "true" &&
    process.env.ELORIA_TRUST_PROXY !== "1"
  ) {
    return "none";
  }

  const provider = process.env.ELORIA_PROXY_PROVIDER?.trim().toLowerCase();

  if (provider === "cloudflare") return "cloudflare";
  if (provider === "generic") return "generic";

  // Never silently trust forwarded headers when the provider is missing/misspelled.
  return "none";
}

function validIp(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/^\[|\]$/g, "") ?? "";
  return isIP(normalized) ? normalized : null;
}

function forwardedIp(values: Headers): string | null {
  const provider = proxyProvider();
  if (provider === "none") return null;

  if (provider === "cloudflare") {
    return validIp(values.get("cf-connecting-ip"));
  }

  return (
    validIp(values.get("x-real-ip")) ||
    validIp(values.get("x-forwarded-for")?.split(",")[0])
  );
}

export function requestIp(request: NextRequest): string {
  return forwardedIp(request.headers) || "unknown";
}

export async function serverActionIp(): Promise<string> {
  const values = await headers();
  return forwardedIp(values) || "unknown";
}

export function hasTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")?.replace(/\/$/, "");
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

  const allowed = new Set(
    [request.nextUrl.origin.replace(/\/$/, ""), configured].filter(Boolean),
  );

  if (origin) return allowed.has(origin);
  if (process.env.NODE_ENV !== "production") return true;

  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === "same-origin" || fetchSite === "same-site";
}
