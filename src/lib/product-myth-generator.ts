/** The canonical, local story library: stable, reviewable, and no external AI required. */
type ProductMythInput = { nameFa: string; nameEn?: string; material?: string };

export type ProductWorldProfile = {
  characterNameFa: string; characterNameEn: string; roleFa: string; roleEn: string;
  homelandFa: string; homelandEn: string; eraFa: string; eraEn: string;
  appearanceFa: string; appearanceEn: string; relicMeaningFa: string; relicMeaningEn: string;
  motherLegendAnchor: string; guardianNameFa: string; guardianNameEn: string;
  guardianDomainFa: string; guardianDomainEn: string; visualPromptFa: string;
};
export type ProductMythOutput = { mythKey: string; mythNameFa: string; mythNameEn: string; legendFa: string; legendEn: string; worldProfile: ProductWorldProfile };

const guardians = [
  ["یلدا", "Yalda", "رازهای پنهان", "hidden mysteries", "باغ‌های خاموش ماه", "the silent gardens of the moon", "پروانهٔ شب"],
  ["ماهورا", "Mahoora", "رویا و زیبایی", "dreams and beauty", "قصرهای آسمانی", "the sky palaces", "پرندهٔ ماه"],
  ["آتوسا", "Atossa", "اصالت و میراث", "heritage and memory", "تالارهای سیمرغ", "the Simurgh halls", "سیمرغ"],
  ["آناهید", "Anahid", "زندگی و احساس", "life and feeling", "چشمه‌های زنده", "the living springs", "نیلوفر آبی"],
  ["پرنیا", "Parnia", "هنر دست", "handmade art", "کارگاه تارهای طلایی", "the workshop of golden threads", "تارهای طلایی"],
  ["ویستا", "Vista", "خرد و کشف", "wisdom and discovery", "کتابخانه‌های نور", "the libraries of light", "جغد دانا"],
  ["رها", "Raha", "آزادی و آفرینش", "freedom and creation", "گذرگاه باد", "the wind passage", "پرندهٔ مهاجر"],
] as const;

// 7 × 22 = 154 unique tales, each permanently linked to one guardian.
const archetypes = [
  ["آوای گمشده", "Lost Melody"], ["گره سپیده", "Dawn Knot"], ["نشان باران", "Rain Sign"], ["چراغ خاموش", "Quiet Lamp"], ["آینهٔ نیلی", "Indigo Mirror"], ["ردّ انار", "Pomegranate Trace"], ["مُهر سرو", "Cypress Seal"], ["پلکان ماه", "Moon Stair"], ["دستبند رود", "River Bracelet"], ["راز فیروزه", "Turquoise Secret"], ["پرِ آتش", "Fire Feather"], ["ستارهٔ گره‌خورده", "Knotted Star"], ["کلید باغ", "Garden Key"], ["نفس کویر", "Desert Breath"], ["حلقهٔ بازگشت", "Return Ring"], ["نامهٔ بی‌نام", "Nameless Letter"], ["شعلهٔ آرام", "Gentle Flame"], ["موجِ آخر", "Last Wave"], ["نقشهٔ پنهان", "Hidden Map"], ["سایهٔ روشن", "Luminous Shadow"], ["قولِ هفتم", "Seventh Promise"], ["یادگار درخت", "Tree Relic"],
] as const;

function profile(index: number, input: ProductMythInput): ProductWorldProfile {
  const guardian = guardians[Math.floor(index / archetypes.length)];
  const [guardianNameFa, guardianNameEn, domainFa, domainEn, homelandFa, homelandEn, symbol] = guardian;
  const characterNameFa = `${archetypes[index % archetypes.length][0]}ِ ${guardianNameFa}`;
  const characterNameEn = `${guardianNameEn}'s ${archetypes[index % archetypes.length][1]}`;
  const piece = input.nameFa.trim();
  return { characterNameFa, characterNameEn, roleFa: `شاگرد و پیام‌آور ${guardianNameFa}`, roleEn: `apprentice and messenger of ${guardianNameEn}`, homelandFa, homelandEn, eraFa: "پس از پیمان نخستین", eraEn: "after the First Covenant", appearanceFa: "چهره و پوشش الهام‌گرفته از هنر ایران؛ بدون عناصر فانتزی غربی", appearanceEn: "Iranian-inspired face and dress; without Western fantasy elements", relicMeaningFa: `«${piece}» نشانی از ${guardianNameFa} است و یکی از رشته‌های نقشهٔ درخت خاطره‌ها را نگه می‌دارد.`, relicMeaningEn: `“${(input.nameEn ?? input.nameFa).trim()}” carries ${guardianNameEn}'s mark and preserves one thread of the Tree of Memories map.`, motherLegendAnchor: "seven-guardians-first-covenant", guardianNameFa, guardianNameEn, guardianDomainFa: domainFa, guardianDomainEn: domainEn, visualPromptFa: `پرتره سینمایی و واقع‌گرایانه از ${characterNameFa}، شاگرد ${guardianNameFa}، با چهره و پوشش ایرانی، نماد ${symbol}، زیور «${piece}» و فضای ${homelandFa}؛ بدون عناصر رومی، یونانی، عربی، اروپایی یا فانتزی غربی.` };
}

export const ELORIA_MYTH_LIBRARY: readonly ProductMythOutput[] = guardians.flatMap((guardian, guardianIndex) => archetypes.map((archetype, archetypeIndex) => {
  const index = guardianIndex * archetypes.length + archetypeIndex;
  const [guardianNameFa, guardianNameEn, domainFa, domainEn, homelandFa, homelandEn] = guardian;
  const mythNameFa = `${archetype[0]}ِ ${guardianNameFa}`;
  const mythNameEn = `${guardianNameEn}'s ${archetype[1]}`;
  return { mythKey: `guardian-${String(guardianIndex + 1).padStart(2, "0")}-${String(archetypeIndex + 1).padStart(2, "0")}`, mythNameFa, mythNameEn, legendFa: `«${mythNameFa}» روزی در ${homelandFa} پدیدار شد. ${guardianNameFa} آن را به یکی از پیروان خود سپرد تا ${domainFa} از یاد نرود؛ این نشان هنوز رشته‌ای از نقشهٔ درخت خاطره‌ها و پیمان هفت نگهبان را حفظ می‌کند.`, legendEn: `“${mythNameEn}” appeared in ${homelandEn}. ${guardianNameEn} entrusted it to a follower so that ${domainEn} would not be forgotten; the Sign still keeps one thread of the Tree of Memories map and the covenant of the Seven Guardians.`, worldProfile: profile(index, { nameFa: mythNameFa, nameEn: mythNameEn }) };
}));

function stableIndex(value: string): number { let hash = 2166136261; for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0) % ELORIA_MYTH_LIBRARY.length; }
function personalize(myth: ProductMythOutput, input: ProductMythInput): ProductMythOutput { const fa = input.nameFa.trim(); const en = (input.nameEn ?? input.nameFa).trim(); return { ...myth, legendFa: myth.legendFa.replace(`«${myth.mythNameFa}»`, `«${fa}»`), legendEn: myth.legendEn.replace(`“${myth.mythNameEn}”`, `“${en}”`), worldProfile: profile(ELORIA_MYTH_LIBRARY.indexOf(myth), input) }; }
export function generateProductMyth(input: ProductMythInput): ProductMythOutput { return personalize(ELORIA_MYTH_LIBRARY[stableIndex(`${input.nameFa}|${input.nameEn ?? ""}|${input.material ?? ""}`)], input); }
export function getProductMythByKey(mythKey: string, input: ProductMythInput): ProductMythOutput | null { const myth = ELORIA_MYTH_LIBRARY.find((item) => item.mythKey === mythKey); return myth ? personalize(myth, input) : null; }
export function generateUnusedProductMyth(input: ProductMythInput, usedKeys: ReadonlySet<string>): ProductMythOutput { const start = stableIndex(`${input.nameFa}|${input.nameEn ?? ""}|${input.material ?? ""}`); for (let offset = 0; offset < ELORIA_MYTH_LIBRARY.length; offset += 1) { const myth = ELORIA_MYTH_LIBRARY[(start + offset) % ELORIA_MYTH_LIBRARY.length]; if (!usedKeys.has(myth.mythKey)) return personalize(myth, input); } throw new Error("ELORIA_MYTH_LIBRARY_EXHAUSTED"); }
