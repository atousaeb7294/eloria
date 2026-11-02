import { ELORIA_PRODUCT_LEGENDS, ELORIA_MEN_PRODUCT_LEGENDS } from "@/lib/eloria-product-legend-source";
import { getProductMythByKey } from "@/lib/product-myth-generator";
import { productAudience } from "@/lib/product-audience";
const originals = new Map([...ELORIA_PRODUCT_LEGENDS, ...ELORIA_MEN_PRODUCT_LEGENDS].map(entry => [entry.key, entry]));

type StoryRecord = { mythKey: string | null; nameFa: string; nameEn: string; material: string; specifications: unknown; mythNameFa: string | null; mythNameEn: string | null; legendFa: string | null; legendEn: string | null };
export function canonicalProductStory<T extends StoryRecord>(product: T): T {
  if (!product.mythKey) return product;
  const myth = getProductMythByKey(product.mythKey, { ...product, audience: productAudience(product.specifications) });
  if (!myth) return product;
  const original = originals.get(myth.mythKey);
  // Recognise the previous automatic copy per language, preserving editorial overrides.
  const replaceName = (text: string | null, oldName: string | null, name: string) =>
    text && oldName && oldName !== name ? text.split(oldName).join(name) : text;
  const fa = replaceName(product.legendFa, product.mythNameFa, myth.mythNameFa);
  const en = replaceName(product.legendEn, product.mythNameEn, myth.mythNameEn);
  return { ...product, mythNameFa: myth.mythNameFa, mythNameEn: myth.mythNameEn,
    legendFa: !fa?.trim() || fa.trim() === original?.legacyLegendFa ? myth.legendFa : fa,
    legendEn: !en?.trim() || en.trim() === original?.legacyLegendEn ? myth.legendEn : en,
  };
}
