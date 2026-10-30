import { UPLOADED_HERO_VERSION } from "./home-design-contract";

export type HomePiece = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  imageId?: string;
  cutoutUrl?: string;
  group: "gold" | "silver" | "weave";
  variants?: { id: string; titleFa: string; titleEn: string; stock: number }[];
};
export type HomeDesign = {
  pieces: HomePiece[];
  treasuryPieces?: HomePiece[];
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
  variants?: HomePiece["variants"];
};
export type HomeAppearance = {
  heroScale: number;
  featuredProductIds: string[];
  featuredCutoutIds: string[];
  heroCutout: HomePreparedHero | null;
};
export type HomePreparedHero = {
  id: string;
  pipelineVersion?: string;
  sourceImageId: string;
  sourceImageUrl: string;
  product: HomeProduct;
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
  treasuryProduct?(group: HomePiece["group"]): Promise<HomeProduct | null>;
  cutouts(ids: string[]): Promise<HomeCutout[]>;
  preparedHeroes?(): Promise<HomePreparedHero[]>;
  report(area: "appearance" | "catalog" | "cutouts"): void;
};

const visible = (p: HomeProduct) =>
  ["ACTIVE", "OUT_OF_STOCK"].includes(p.status) &&
  p.collection.isActive && Boolean(p.images[0]?.imageUrl.trim());

/** Optional display settings must never take the working catalog offline. */
export async function loadHomeDesign(locale: string, source: HomeDesignSource, random = Math.random): Promise<HomeDesign> {
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
      ...(p.variants ? { variants: p.variants } : {}),
    };
  };
  const pieces = products.map(piece);
  // Selected pieces stay unchanged. A missing category gets its own real
  // catalog photo instead of a stock illustration or the wrong treasury.
  const treasuryPieces = (await Promise.all((["gold", "silver", "weave"] as const).map(async group => {
    const featured = pieces.find(item => item.group === group);
    if (featured) return featured;
    try {
      const product = await source.treasuryProduct?.(group);
      if (product && visible(product)) {
        const result = piece(product);
        if (result.group === group) return result;
      }
    } catch { source.report("catalog"); }
    return null;
  }))).filter((item): item is HomePiece => Boolean(item));
  const currentImage = (item: HomePreparedHero) => item.product.images.find(image =>
    image.id === item.sourceImageId && image.imageUrl === item.sourceImageUrl);
  const current = (item: HomePreparedHero) => visible(item.product) &&
    (item.pipelineVersion === UPLOADED_HERO_VERSION || Boolean(currentImage(item)));
  let selected = appearance?.heroCutout;
  if (!selected || !current(selected)) {
    try {
      // Pick once on the server, so hydration never swaps the photo or title.
      const candidates = (await source.preparedHeroes?.() ?? []).filter(current);
      const unique = [...new Map(candidates.map(item => [item.product.id, item])).values()];
      selected = unique[Math.min(unique.length - 1, Math.max(0, Math.floor(random() * unique.length)))];
    } catch { source.report("cutouts"); }
  }
  const selectedImage = selected && current(selected) ? currentImage(selected) : undefined;
  const scale = Math.min(100, Math.max(60, appearance?.heroScale ?? 90));
  const fallback = pieces.find(item => item.cutoutUrl);
  const hero = selected && current(selected)
    ? { ...piece(selected.product), imageUrl: selected.pipelineVersion === UPLOADED_HERO_VERSION ? `/api/media/hero/${selected.id}` : selectedImage!.imageUrl,
        imageId: selected.pipelineVersion === UPLOADED_HERO_VERSION ? undefined : selectedImage?.id,
        cutoutUrl: `/api/media/hero/${selected.id}`, scale }
    : fallback ? { ...fallback, scale } : null;
  return { pieces, treasuryPieces, hero, unavailable: false };
}
