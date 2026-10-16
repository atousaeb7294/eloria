export type Treasury = "gold" | "silver" | "weave";
export type PalaceProduct = {
  name: string;
  slug: string;
  imageUrl: string;
  hasGold: boolean;
  hasSilver: boolean;
  isFeatured?: boolean;
};

// Retain the order of the existing eight display positions. All visible
// names, photographs and links come from the same current catalogue record.
const selectionNames = [
  "دلبر", "نقره ماه", "مینا شب", "کهن‌نشان",
  "آتش خاموش", "دلبر سپید", "رخ سرخ", "در نیلگون",
];

function normalizedName(value: string) {
  return value.normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/[\s\u200c\u064b-\u065f]/g, "").toLowerCase();
}

export function readPalaceProducts(value: unknown): PalaceProduct[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((item): item is PalaceProduct => {
    if (!item || typeof item !== "object") return false;
    const p = item as Partial<PalaceProduct>;
    if (typeof p.name !== "string" || !p.name.trim() ||
      typeof p.slug !== "string" || !p.slug.trim() || p.slug.length > 240 ||
      typeof p.imageUrl !== "string" || !/^(\/(?!\/)|https:\/\/)/.test(p.imageUrl) ||
      typeof p.hasGold !== "boolean" || typeof p.hasSilver !== "boolean" || seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });
}

export function treasuryProducts(products: PalaceProduct[], treasury: Treasury) {
  return products.filter(p => treasury === "gold" ? p.hasGold
    : treasury === "silver" ? p.hasSilver : !p.hasGold && !p.hasSilver).slice(0, 3);
}

export function featuredProducts(products: PalaceProduct[]): (PalaceProduct | null)[] {
  const selected = products.filter(p => p.isFeatured);
  const pool = selected.length ? selected : products;
  const ordered = selectionNames.flatMap(name => pool.find(p => normalizedName(p.name) === normalizedName(name)) ?? []);
  const used = new Set(ordered.map(p => p.slug));
  const rest = pool.filter(p => !used.has(p.slug));
  // Fill spare positions with other live products when the admin has marked
  // fewer than eight selections. Empty positions never use reference photos.
  const chosen = [...ordered, ...rest, ...products.filter(p => !pool.includes(p))];
  return Array.from({ length: 8 }, (_, index) => chosen[index] ?? null);
}

export function productHref(product: PalaceProduct) {
  return `/fa/products/${encodeURIComponent(product.slug)}`;
}
