export type ProductAudience = "WOMEN" | "MEN";

/** Explicit admin metadata; never infer the audience from a name, metal or image. */
export function productAudience(specifications: unknown): ProductAudience {
  return specifications !== null && typeof specifications === "object" &&
    !Array.isArray(specifications) &&
    (specifications as Record<string, unknown>).eloriaAudience === "MEN"
    ? "MEN" : "WOMEN";
}

export function withProductAudience(specifications: unknown, audience: ProductAudience) {
  if (specifications !== null && specifications !== undefined &&
      (typeof specifications !== "object" || Array.isArray(specifications))) {
    throw new Error("ساختار مشخصات این محصول نیاز به بررسی دارد؛ اطلاعات قبلی تغییر نکرد.");
  }
  return { ...(specifications as Record<string, never> | null), eloriaAudience: audience };
}
