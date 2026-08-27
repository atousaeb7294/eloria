import { NextResponse } from "next/server";

import { hasValidAdminSession } from "@/lib/admin-auth";
import { generateProductMyth } from "@/lib/ai/myth-generator";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasValidAdminSession())) {
    return NextResponse.json(
      { success: false, error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const raw: unknown = await request.json();
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return NextResponse.json({ success: false, error: "invalid body" }, { status: 400 });
    }

    const product = raw as Record<string, unknown>;
    const nameFa = typeof product.nameFa === "string"
      ? product.nameFa.trim()
      : typeof product.name === "string"
        ? product.name.trim()
        : "";
    const nameEn = typeof product.nameEn === "string" ? product.nameEn.trim() : nameFa;
    const material = typeof product.material === "string" ? product.material.trim() : undefined;

    if (!nameFa || nameFa.length > 180 || nameEn.length > 180) {
      return NextResponse.json(
        { success: false, error: "product name is required" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const legend = await generateProductMyth({ nameFa, nameEn, material });
    return NextResponse.json(
      { success: true, legend },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Eloria Legend] generation error", error);
    return NextResponse.json(
      { success: false, error: "failed to generate legend" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
