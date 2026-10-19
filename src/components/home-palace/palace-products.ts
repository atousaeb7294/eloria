export type Treasury = "gold" | "silver" | "weave";
export type PalaceProduct = {
  name: string;
  slug: string;
  imageUrl: string;
  hasGold: boolean;
  hasSilver: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
};

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

function ordered(products: PalaceProduct[]) {
  // Stable sorting preserves the API's deterministic tie-break order.
  return [...products].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

export function treasuryProducts(products: PalaceProduct[], treasury: Treasury) {
  return ordered(products.filter(p => treasury === "gold" ? p.hasGold
    : treasury === "silver" ? p.hasSilver : !p.hasGold && !p.hasSilver)).slice(0, 3);
}

export function featuredProducts(products: PalaceProduct[]): PalaceProduct[] {
  const selected = products.filter(p => p.isFeatured === true);
  // Before the first manual selection, show real catalogue products. Once
  // curated, never fill spare positions with products the owner did not pick.
  return ordered(selected.length ? selected : products).slice(0, 9);
}

export function productHref(product: PalaceProduct) {
  return `/fa/products/${encodeURIComponent(product.slug)}`;
}
