/** Coordinates in the supplied 985 x 1596 reference. The artwork is not redrawn. */
export const REFERENCE_GATE_ART = "/images/brand/eloria-gates-reference-v11.jpg";
export const GATE_SIZE = { width: 460, height: 480 } as const;
export const GATE_SOURCE_SIZE = { width: 985, height: 1596 } as const;
export const GATE_CROPS = {
  gold: { x: 490, y: 102 },
  silver: { x: 490, y: 588 },
  weave: { x: 490, y: 1067 },
} as const;
export type GateTreasury = keyof typeof GATE_CROPS;

// The clipping edge follows the outer columns, pointed crown and base.
export const GATE_SILHOUETTE = "M4 478V473H16V149L12 144L19 133L29 123L36 133L43 140L41 148H40V170C48 114 111 79 174 49C201 36 220 19 231 2C242 19 261 36 288 49C351 79 414 114 422 170V148H420L419 140L426 133L436 123L443 133L450 144L445 149V473H456V478Z";
export const GATE_OPENING = "M58 467V187C58 131 135 91 231 60C327 91 406 131 406 187V467Z";

// The silver reference is ajar. Expand only its existing glass panels to meet
// at the seam; the pictured vase/interior is never part of the visible layers.
export const SILVER_LEFT_GLASS = { origin: 58, scale: 173 / 142 };
export const SILVER_RIGHT_GLASS = { origin: 406, scale: 175 / 142 };
