import { NextRequest, NextResponse } from "next/server";
import { getPricedProductsCatalog } from "@/lib/priced-catalog";
import { normalizeCatalogPage } from "@/lib/catalog-pagination";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { requestIp } from "@/lib/security/request";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const treasury = params.get("treasury");
  if (treasury !== "gold" && treasury !== "silver" && treasury !== "weave")
    return NextResponse.json({ successful: false }, { status: 400 });
  const limit = await consumeRateLimit({
    key: `treasury-catalog:${requestIp(request)}`,
    limit: 60,
    windowMs: 60000,
  });
  if (!limit.allowed)
    return NextResponse.json(
      { successful: false },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  const price = (key: string) => {
    const value = params.get(key) ?? "";
    return /^\d{1,15}$/.test(value) ? value : "";
  };
  const category = params.get("collection") ?? "";
  try {
    const catalog = await getPricedProductsCatalog({
      search: (params.get("q") ?? "").trim().slice(0, 160),
      material:
        treasury === "gold"
          ? "GOLD"
          : treasury === "silver"
            ? "SILVER"
            : undefined,
      weaveOnly: treasury === "weave",
      collectionSlug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)
        ? category
        : undefined,
      availability:
        params.get("availability") === "available"
          ? "AVAILABLE"
          : params.get("availability") === "out-of-stock"
            ? "OUT_OF_STOCK"
            : "ALL",
      minPriceToman: price("minPrice"),
      maxPriceToman: price("maxPrice"),
      page: normalizeCatalogPage(Number(params.get("page"))),
      pageSize: 24,
    });
    return NextResponse.json(
      {
        successful: true,
        products: catalog.products,
        page: catalog.page,
        pageCount: catalog.pageCount,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { successful: false, message: "ادامهٔ آثار دریافت نشد." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
