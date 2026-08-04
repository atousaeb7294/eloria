import { headers } from "next/headers";
import type { NextRequest } from "next/server";

function trustProxy(): boolean {
  return process.env.ELORIA_TRUST_PROXY === "true" || process.env.ELORIA_TRUST_PROXY === "1";
}

function forwardedIp(values: Headers): string | null {
  if (!trustProxy()) return null;
  return (
    values.get("cf-connecting-ip")?.trim() ||
    values.get("x-real-ip")?.trim() ||
    values.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
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
  const allowed = new Set([request.nextUrl.origin.replace(/\/$/, ""), configured].filter(Boolean));

  if (origin) return allowed.has(origin);
  if (process.env.NODE_ENV !== "production") return true;

  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === "same-origin" || fetchSite === "same-site";
}
