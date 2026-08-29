import { NextRequest, NextResponse } from "next/server";

import { getPricedProductsCatalog } from "@/lib/priced-catalog";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";

export const dynamic = "force-dynamic";

type SelectionPayload = {
  locale?: "fa" | "en";
  recipient?: "self" | "gift";
  style?: "delicate" | "classic" | "mysterious" | "bold" | "free";
  material?: "gold" | "silver" | "all";
  collection?: "necklaces" | "bracelets" | "earrings" | "all";
  budget?: string;
  clue?: string;
};

const styleTerms: Record<Exclude<SelectionPayload["style"], undefined>, { fa: string; en: string }> = {
  delicate: { fa: "ظریف مینیمال", en: "delicate minimal" },
  classic: { fa: "اصیل کلاسیک", en: "classic refined" },
  mysterious: { fa: "رازآلود افسانه", en: "mysterious legend" },
  bold: { fa: "جسور شاخص", en: "bold statement" },
  free: { fa: "", en: "" },
};

function cleanBudget(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^\d]/g, "")
    .slice(0, 15);
  return normalized || undefined;
}

function cleanClue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 60);
}

function reasonFa(payload: SelectionPayload, product: { material: "GOLD" | "SILVER"; collectionSlug: string }, usedClue: boolean): string {
  const reasons: string[] = [];
  if (payload.recipient === "gift") reasons.push("برای انتخاب هدیه، گزینه‌ای کم‌ریسک و قابل‌هدیه‌دادن است");
  if (payload.style && payload.style !== "free") {
    const labels = { delicate: "حال‌وهوای ظریف", classic: "حس اصیل", mysterious: "فضای رازآلود", bold: "بیان جسور" } as const;
    reasons.push(`به ${labels[payload.style]} انتخابی تو نزدیک است`);
  }
  if (payload.material && payload.material !== "all") reasons.push(`با جنس ${product.material === "GOLD" ? "طلا" : "نقره"} موردنظر تو هماهنگ است`);
  if (payload.budget) reasons.push("در محدوده بودجه انتخاب‌شده قرار می‌گیرد");
  if (usedClue && payload.clue) reasons.push(`با نشانه «${cleanClue(payload.clue)}» در اطلاعات اثر هم‌خوانی دارد`);
  return (reasons.slice(0, 2).join(" و ") || "از میان آثار موجود، یکی از نزدیک‌ترین انتخاب‌ها به ترجیحات ثبت‌شده است") + ".";
}

function reasonEn(payload: SelectionPayload, product: { material: "GOLD" | "SILVER" }, usedClue: boolean): string {
  const reasons: string[] = [];
  if (payload.recipient === "gift") reasons.push("it is a balanced gift-friendly choice");
  if (payload.style && payload.style !== "free") reasons.push("its character is close to your selected mood");
  if (payload.material && payload.material !== "all") reasons.push(`it matches your preferred ${product.material === "GOLD" ? "gold" : "silver"} material`);
  if (payload.budget) reasons.push("it fits the selected budget ceiling");
  if (usedClue && payload.clue) reasons.push(`its catalog information matches “${cleanClue(payload.clue)}”`);
  return (reasons.slice(0, 2).join(" and ") || "it is one of the closest available matches to your preferences") + ".";
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ successful: false }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const rate = await consumeRateLimit({
    key: `smart-selection:${requestIp(request)}`,
    limit: 30,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { successful: false, message: "Too many requests." },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let payload: SelectionPayload;
  try {
    payload = (await request.json()) as SelectionPayload;
  } catch {
    return NextResponse.json({ successful: false, message: "Invalid request." }, { status: 400 });
  }

  const locale = payload.locale === "en" ? "en" : "fa";
  const material = payload.material === "gold" ? "GOLD" : payload.material === "silver" ? "SILVER" : undefined;
  const collectionSlug = payload.collection && payload.collection !== "all" ? payload.collection : undefined;
  const budget = cleanBudget(payload.budget);
  const clue = cleanClue(payload.clue);
  const style = payload.style && styleTerms[payload.style] ? styleTerms[payload.style][locale] : "";
  const search = [style, clue].filter(Boolean).join(" ").trim();

  try {
    const primary = await getPricedProductsCatalog({
      search: search || undefined,
      material,
      collectionSlug,
      availability: "AVAILABLE",
      maxPriceToman: budget,
      page: 1,
      pageSize: 6,
    });

    let products = primary.products;
    let usedClue = Boolean(search);

    if (products.length < 3 && search) {
      const fallback = await getPricedProductsCatalog({
        material,
        collectionSlug,
        availability: "AVAILABLE",
        maxPriceToman: budget,
        page: 1,
        pageSize: 8,
      });
      const seen = new Set(products.map(item => item.id));
      products = [...products, ...fallback.products.filter(item => !seen.has(item.id))].slice(0, 6);
      if (primary.products.length === 0) usedClue = false;
    }

    const selected = products.slice(0, 3).map(product => ({
      ...product,
      reason: locale === "fa" ? reasonFa(payload, product, usedClue) : reasonEn(payload, product, usedClue),
    }));

    return NextResponse.json(
      {
        successful: true,
        profile: {
          recipient: payload.recipient ?? "self",
          style: payload.style ?? "free",
          material: payload.material ?? "all",
          collection: payload.collection ?? "all",
          budget: budget ?? null,
          clue: clue || null,
        },
        products: selected,
        fallbackUsed: Boolean(search) && primary.products.length < 3,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Eloria Smart Selection] Unable to create recommendation.", error);
    return NextResponse.json(
      {
        successful: false,
        message: locale === "fa" ? "انتخاب هوشمند موقتاً در دسترس نیست. دوباره تلاش کنید." : "Smart selection is temporarily unavailable. Please try again.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
