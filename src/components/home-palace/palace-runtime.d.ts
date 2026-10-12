export type PalaceProduct = {
  slug: string; name: string; imageUrl: string;
  hasGold?: boolean; hasSilver?: boolean; material?: string;
};
export function mountHomePalace(root: HTMLElement, options: {
  navigateToTreasury: (slug: "gold" | "silver" | "weave") => void;
}): () => void;
