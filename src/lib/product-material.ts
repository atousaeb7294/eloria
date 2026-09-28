/** Flags are authoritative, including false/false. Only old payloads lack them. */
export type ProductMaterialKind = "GOLD" | "SILVER" | "MIXED" | "WEAVE";
export type ProductMaterialSource = {
  material: "GOLD" | "SILVER";
  hasGold?: boolean;
  hasSilver?: boolean;
  metalComponents?: { hasGold: boolean; hasSilver: boolean };
};
export function productMaterialKind(product: ProductMaterialSource): ProductMaterialKind {
  const gold = product.hasGold ?? product.metalComponents?.hasGold;
  const silver = product.hasSilver ?? product.metalComponents?.hasSilver;
  // Once any component information is present, never invent a missing metal.
  if (gold !== undefined || silver !== undefined) {
    return gold ? (silver ? "MIXED" : "GOLD") : silver ? "SILVER" : "WEAVE";
  }
  return product.material;
}
export function productMaterialLabel(product: ProductMaterialSource, locale: string): string {
  const labels = {
    GOLD: ["طلا", "Gold"], SILVER: ["نقره", "Silver"],
    MIXED: ["طلا و نقره", "Gold and silver"], WEAVE: ["بافت بدون فلز", "Weave only"],
  };
  return labels[productMaterialKind(product)][locale === "fa" ? 0 : 1];
}
