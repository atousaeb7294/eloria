import { getProductMythByKey } from "@/lib/product-myth-generator";
import { productAudience } from "@/lib/product-audience";
type StoryRecord = { mythKey: string | null; nameFa: string; nameEn: string; material: string; specifications: unknown; mythNameFa: string | null; mythNameEn: string | null; legendFa: string | null; legendEn: string | null };
export function canonicalProductStory<T extends StoryRecord>(product: T): T {
  if (!product.mythKey) return product;
  const myth = getProductMythByKey(product.mythKey, { ...product, audience: productAudience(product.specifications) });
  if (!myth) return product;
  // Preserve authored prose; replace only the assigned character’s old name.
  const replaceName = (text: string | null, oldName: string | null, name: string) =>
    text && oldName && oldName !== name ? text.split(oldName).join(name) : text;
  return { ...product, mythNameFa: myth.mythNameFa, mythNameEn: myth.mythNameEn,
    legendFa: replaceName(product.legendFa, product.mythNameFa, myth.mythNameFa),
    legendEn: replaceName(product.legendEn, product.mythNameEn, myth.mythNameEn),
  };
}
