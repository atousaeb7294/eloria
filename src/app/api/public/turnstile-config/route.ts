import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

  const required = process.env.NODE_ENV === "production" || Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());

  return NextResponse.json(
    { siteKey, required },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
