import { generateProductMyth as generateCanonicalMyth, type ProductMythOutput } from "@/lib/product-myth-generator";
import type { ProductAudience } from "@/lib/product-audience";
type MythInput = { nameFa: string; nameEn: string; material?: string; audience?: ProductAudience };
export async function generateProductMyth(input: MythInput): Promise<ProductMythOutput> {
  return generateCanonicalMyth(input);
}
