import { NextRequest, NextResponse } from "next/server";
import { automaticCutoutStatus } from "@/lib/automatic-cutout";
import { UUID_PATTERN } from "@/lib/home-design-contract";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { requestIp } from "@/lib/security/request";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function GET(request: NextRequest) {
  const ids = [
    ...new Set((request.nextUrl.searchParams.get("images") ?? "").split(",")),
  ];
  const headers = { "Cache-Control": "private, no-store" };
  if (
    !ids.length ||
    ids.length > 24 ||
    ids.some((id) => !UUID_PATTERN.test(id))
  )
    return NextResponse.json(
      { ready: {}, pending: [] },
      { status: 400, headers },
    );
  try {
    const limit = await consumeRateLimit({
      key: `cutout-status:${requestIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limit.allowed)
      return NextResponse.json(
        { ready: {}, pending: [] },
        { status: 429, headers },
      );
    return NextResponse.json(await automaticCutoutStatus(ids), { headers });
  } catch {
    return NextResponse.json(
      { ready: {}, pending: [] },
      { status: 503, headers },
    );
  }
}
