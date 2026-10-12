export type PalaceProduct = {
  slug: string;
  name: string;
  imageUrl: string;
  hasGold?: boolean;
  hasSilver?: boolean;
  material?: string;
};

export function mountHomePalace(
  root: HTMLElement,
  options: {
    catalog: PalaceProduct[];
    navigateToTreasury: (slug: "gold" | "silver" | "weave") => void;
  },
): () => void;
