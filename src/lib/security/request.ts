import { headers } from "next/headers";
import type { NextRequest } from "next/server";

export function requestIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
}
export async function serverActionIp(): Promise<string> {
  const values = await headers();
  return values.get("x-forwarded-for")?.split(",")[0]?.trim() || values.get("x-real-ip")?.trim() || "unknown";
}
export function hasTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const allowed = new Set([request.nextUrl.origin, configured].filter(Boolean));
  return allowed.has(origin.replace(/\/$/, ""));
}
