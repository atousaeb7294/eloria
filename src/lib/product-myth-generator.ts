import { ELORIA_GUARDIANS } from "@/lib/eloria-mythology";
import {
  ELORIA_PRODUCT_LEGENDS,
  type CanonicalProductLegend,
} from "@/lib/eloria-product-legend-source";

type ProductMythInput = { nameFa: string; nameEn?: string; material?: string };

export type ProductWorldProfile = {
  characterNameFa: string;
  characterNameEn: string;
  characterTitleFa: string;
  characterTitleEn: string;
  roleFa: string;
  roleEn: string;
  homelandFa: string;
  homelandEn: string;
  branchFa: string;
  branchEn: string;
  eraFa: string;
  eraEn: string;
  age: number;
  appearanceFa: string;
  appearanceEn: string;
  clothingFa: string;
  accessoryFa: string;
  relicMeaningFa: string;
  relicMeaningEn: string;
  motherLegendAnchor: string;
  guardianNameFa: string;
  guardianNameEn: string;
  guardianDomainFa: string;
  guardianDomainEn: string;
  visualPromptFa: string;
};

export type ProductMythOutput = {
  mythKey: string;
  mythNameFa: string;
  mythNameEn: string;
  legendFa: string;
  legendEn: string;
  worldProfile: ProductWorldProfile;
};

function toProductMyth(
  character: CanonicalProductLegend,
  input: ProductMythInput,
): ProductMythOutput {
  const guardian = ELORIA_GUARDIANS.find(
    (candidate) => candidate.id === character.guardianId,
  );
  if (!guardian) {
    throw new Error(`ELORIA_GUARDIAN_NOT_FOUND:${character.guardianId}`);
  }

  const productNameFa = input.nameFa.trim();
  const productNameEn = (input.nameEn ?? input.nameFa).trim();
  return {
    mythKey: character.key,
    mythNameFa: character.nameFa,
    mythNameEn: character.nameEn,
    legendFa: character.legendFa,
    legendEn: character.legendEn,
    worldProfile: {
      characterNameFa: character.nameFa,
      characterNameEn: character.nameEn,
      characterTitleFa: character.titleFa,
      characterTitleEn: character.titleEn,
      roleFa: character.roleFa,
      roleEn: character.roleEn,
      homelandFa: character.homelandFa,
      homelandEn: character.homelandEn,
      branchFa: character.branchFa,
      branchEn: character.branchEn,
      eraFa: "پس از پیمان نخستین",
      eraEn: "After the First Covenant",
      age: character.age,
      appearanceFa: character.appearanceFa,
      appearanceEn: `Canonical Iranian character portrait of ${character.nameEn}, age ${character.age}.`,
      clothingFa: character.clothingFa,
      accessoryFa: character.accessoryFa,
      relicMeaningFa: `«${productNameFa}» یادگار فیزیکی انتخاب اخلاقی ${character.nameFa} در افسانهٔ پنهان اوست.`,
      relicMeaningEn: `“${productNameEn}” is the physical relic of ${character.nameEn}’s moral choice in her hidden legend.`,
      motherLegendAnchor: "seven-guardians-first-covenant",
      guardianNameFa: guardian.nameFa,
      guardianNameEn: guardian.nameEn,
      guardianDomainFa: guardian.domainFa,
      guardianDomainEn: guardian.domainEn,
      visualPromptFa: [
        `پرترهٔ سینمایی فوق‌واقع‌گرایانه از ${character.nameFa}، ${character.titleFa}`,
        character.appearanceFa,
        character.clothingFa,
        character.accessoryFa,
        `در ${character.homelandFa}، زیرمجموعهٔ ${guardian.nameFa} و شاخهٔ ${character.branchFa}`,
        `زیور مرتبط: «${productNameFa}»؛ هویت بصری ایرانی، بدون عناصر فانتزی غربی، پوست طبیعی با micro pores، نورپردازی سینمایی و بافت واقعی پارچه، فلز و سنگ`,
      ].join(". "),
    },
  };
}

/** Only these 20 canonical young and middle-aged women may feed product myths. */
export const ELORIA_MYTH_LIBRARY: readonly ProductMythOutput[] =
  ELORIA_PRODUCT_LEGENDS.map((character) =>
    toProductMyth(character, {
      nameFa: character.nameFa,
      nameEn: character.nameEn,
    }),
  );

function stableIndex(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % ELORIA_PRODUCT_LEGENDS.length;
}

export function generateProductMyth(input: ProductMythInput): ProductMythOutput {
  return toProductMyth(
    ELORIA_PRODUCT_LEGENDS[
      stableIndex(`${input.nameFa}|${input.nameEn ?? ""}|${input.material ?? ""}`)
    ],
    input,
  );
}

export function getProductMythByKey(
  mythKey: string,
  input: ProductMythInput,
): ProductMythOutput | null {
  const character = ELORIA_PRODUCT_LEGENDS.find(
    (candidate) => candidate.key === mythKey,
  );
  return character ? toProductMyth(character, input) : null;
}

export function generateUnusedProductMyth(
  input: ProductMythInput,
  usedKeys: ReadonlySet<string>,
): ProductMythOutput {
  const start = stableIndex(
    `${input.nameFa}|${input.nameEn ?? ""}|${input.material ?? ""}`,
  );
  for (let offset = 0; offset < ELORIA_PRODUCT_LEGENDS.length; offset += 1) {
    const character =
      ELORIA_PRODUCT_LEGENDS[(start + offset) % ELORIA_PRODUCT_LEGENDS.length];
    if (!usedKeys.has(character.key)) return toProductMyth(character, input);
  }
  throw new Error("ELORIA_MYTH_LIBRARY_EXHAUSTED");
}
