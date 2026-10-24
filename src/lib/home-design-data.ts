export type HomePiece = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  imageId?: string;
  cutoutUrl?: string;
  group: "gold" | "silver" | "weave";
};
export type HomeDesign = {
  pieces: HomePiece[];
  hero: (HomePiece & { scale: number }) | null;
  unavailable: boolean;
};
export type HomeProduct = {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  hasGold: boolean;
  hasSilver: boolean;
  status: string;
  collection: { isActive: boolean };
  images: { id: string; imageUrl: string }[];
};
export type HomeAppearance = {
  heroScale: number;
  featuredProductIds: string[];
  featuredCutoutIds: string[];
  heroCutout: { id: string; product: HomeProduct } | null;
};
export type HomeCutout = {
  id: string;
  productId: string;
  sourceImageId: string;
  sourceImageUrl: string;
};
export type HomeDesignSource = {
  appearance(): Promise<HomeAppearance | null>;
  products(options: { ids?: string[]; excludeIds?: string[]; take: number }): Promise<HomeProduct[]>;
  cutouts(ids: string[]): Promise<HomeCutout[]>;
  report(area: "appearance" | "catalog" | "cutouts"): void;
};

const visible = (p: HomeProduct) =>
  ["ACTIVE", "OUT_OF_STOCK"].includes(p.status) &&
  p.collection.isActive && Boolean(p.images[0]?.imageUrl.trim());

/** Optional display settings must never take the working catalog offline. */
export async function loadHomeDesign(locale: string, source: HomeDesignSource): Promise<HomeDesign> {
  let appearance: HomeAppearance | null = null;
  try { appearance = await source.appearance(); }
  catch { source.report("appearance"); }
  const ids = [...new Set(appearance?.featuredProductIds ?? [])].slice(0, 8);
  let products: HomeProduct[];
  try {
    products = (await source.products({ ids: ids.length ? ids : undefined, take: 8 })).filter(visible);
    if (ids.length) products.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    if (ids.length && products.length < 8) {
      try {
        products.push(...(await source.products({ excludeIds: products.map(p => p.id), take: 8 - products.length })).filter(visible));
      } catch { source.report("catalog"); }
    }
    products = [...new Map(products.map(p => [p.id, p])).values()].slice(0, 8);
  } catch {
    source.report("catalog");
    return { pieces: [], hero: null, unavailable: true };
  }
  let cutouts: HomeCutout[] = [];
  if (appearance?.featuredCutoutIds.length) {
    try { cutouts = await source.cutouts(appearance.featuredCutoutIds.slice(0, 8)); }
    catch { source.report("cutouts"); }
  }
  const piece = (p: HomeProduct): HomePiece => {
    const image = p.images[0];
    const prepared = cutouts.find(c => c.productId === p.id && c.sourceImageId === image.id && c.sourceImageUrl === image.imageUrl);
    return {
      id: p.id, slug: p.slug, name: locale === "fa" ? p.nameFa : (p.nameEn || p.nameFa),
      imageUrl: image.imageUrl,
      imageId: image.id,
      cutoutUrl: prepared ? `/api/media/hero/${prepared.id}` : undefined,
      group: p.hasGold ? "gold" : p.hasSilver ? "silver" : "weave",
    };
  };
  const pieces = products.map(piece);
  const selected = appearance?.heroCutout;
  const hero = selected && visible(selected.product)
    ? { ...piece(selected.product), cutoutUrl: `/api/media/hero/${selected.id}`, scale: Math.min(100, Math.max(60, appearance!.heroScale)) }
    : pieces[0] ? { ...pieces[0], scale: 90 } : null;
  return { pieces, hero, unavailable: false };
}
