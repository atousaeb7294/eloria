import { ELORIA_GUARDIANS } from "@/lib/eloria-mythology";

/** The canonical, local story library: stable, reviewable, and no external AI required. */
type ProductMythInput = { nameFa: string; nameEn?: string; material?: string };

export type ProductWorldProfile = {
  characterNameFa: string;
  characterNameEn: string;
  roleFa: string;
  roleEn: string;
  homelandFa: string;
  homelandEn: string;
  eraFa: string;
  eraEn: string;
  appearanceFa: string;
  appearanceEn: string;
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

// 7 × 22 = 154 unique tales, each permanently linked to one guardian.
const archetypes = [
  ["آوای گمشده", "Lost Melody"],
  ["گره سپیده", "Dawn Knot"],
  ["نشان باران", "Rain Sign"],
  ["چراغ خاموش", "Quiet Lamp"],
  ["آینهٔ نیلی", "Indigo Mirror"],
  ["ردّ انار", "Pomegranate Trace"],
  ["مُهر سرو", "Cypress Seal"],
  ["پلکان ماه", "Moon Stair"],
  ["دستبند رود", "River Bracelet"],
  ["راز فیروزه", "Turquoise Secret"],
  ["پرِ آتش", "Fire Feather"],
  ["ستارهٔ گره‌خورده", "Knotted Star"],
  ["کلید باغ", "Garden Key"],
  ["نفس کویر", "Desert Breath"],
  ["حلقهٔ بازگشت", "Return Ring"],
  ["نامهٔ بی‌نام", "Nameless Letter"],
  ["شعلهٔ آرام", "Gentle Flame"],
  ["موجِ آخر", "Last Wave"],
  ["نقشهٔ پنهان", "Hidden Map"],
  ["سایهٔ روشن", "Luminous Shadow"],
  ["قولِ هفتم", "Seventh Promise"],
  ["یادگار درخت", "Tree Relic"],
] as const;

const hiddenEventsFa = [
  "نامی را که سایهٔ بی‌نام ربوده بود، از روی برگ نقره‌ای درخت خاطره‌ها بازخواند.",
  "گرهی زد که شکاف نخستین شاخه را تا سپیده‌دم بسته نگه داشت.",
  "نشان باران را بر سنگی خشک نهاد تا چشمه‌ای فراموش‌شده دوباره راه بیفتد.",
  "چراغی را که باد خاموش کرده بود با یک خاطرهٔ راستین روشن کرد.",
  "در آینهٔ نیلی، راه بازگشت یک مسافر گمشده را دید و آن را پنهان نگه داشت.",
  "ردّ انار را تا آستانهٔ کتاب ممنوعه دنبال کرد و یک برگ از آن را نجات داد.",
  "مُهر سرو را به وارثی سپرد که هنوز نام خاندانش را به یاد داشت.",
  "از پلکان ماه گذشت تا یک رویای ناتمام را پیش از فراموشی به صاحبش برساند.",
  "دستبند رود را در آب افکند تا دل شکسته‌ای دوباره جرئت امید پیدا کند.",
  "راز فیروزه را تنها با کسی در میان گذاشت که برای حقیقت، نه قدرت، آمده بود.",
  "پرِ آتش را از خاکستر برداشت تا گرمای یک خانه از نقشهٔ جهان پاک نشود.",
  "ستارهٔ گره‌خورده را با تارهای پرنیا بست تا یکی از هفت نور فرو نیفتد.",
  "کلید باغ را زیر نیلوفری پنهان کرد تا سایهٔ بی‌نام به آن نرسد.",
  "نفس کویر را در صدفی نگه داشت تا راهنمای کاروانی بی‌نام شود.",
  "حلقهٔ بازگشت را به دست کسی داد که از گذشته‌اش نمی‌گریخت.",
  "نامهٔ بی‌نام را خواند و فهمید آخرین خاطره هنوز صاحبی در جهان دارد.",
  "شعلهٔ آرام را میان دو دشمن گذاشت تا یک پیمان تازه ممکن شود.",
  "موجِ آخر را دنبال کرد و قطعه‌ای از نقشهٔ درخت خاطره‌ها را از دریا بازگرداند.",
  "نقشهٔ پنهان را فقط برای یک شب گشود تا نسل بعد راه خانه را پیدا کند.",
  "سایهٔ روشن را بر دیوار معبد دید و از آن فهمید تاریکی هنوز تمام نشده است.",
  "قولِ هفتم را به یاد آورد و نگذاشت یکی از نورهای آسمان خاموش شود.",
  "یادگار درخت را در دل یک زیور نشاند تا داستان صاحبش برای همیشه زنده بماند.",
] as const;

const hiddenEventsEn = [
  "read back a name the Nameless Shadow had stolen from a silver leaf of the Tree of Memories.",
  "tied a knot that held the first broken branch together until dawn.",
  "placed the rain sign on dry stone and woke a forgotten spring.",
  "lit a lamp the wind had extinguished with one truthful memory.",
  "saw a lost traveller’s return path in the indigo mirror and kept it safe.",
  "followed a pomegranate trace to a forbidden book and rescued one of its leaves.",
  "gave the cypress seal to an heir who still remembered her family name.",
  "crossed the moon stair to deliver an unfinished dream before it faded.",
  "cast the river bracelet into water so a broken heart could hope again.",
  "shared the turquoise secret only with one who sought truth, not power.",
  "lifted the fire feather from ash so the warmth of a home would remain on the map.",
  "bound the knotted star with Parnia’s threads so one of the seven lights would not fall.",
  "hid the garden key beneath a lotus before the Nameless Shadow could take it.",
  "kept the desert breath in a shell to guide a nameless caravan.",
  "gave the return ring to one who no longer fled their past.",
  "read the nameless letter and learned that the last memory still had an owner.",
  "placed the gentle flame between two enemies so a new covenant became possible.",
  "followed the last wave and recovered a piece of the Tree of Memories map from the sea.",
  "opened the hidden map for one night so the next generation could find home.",
  "saw the luminous shadow on a temple wall and knew the darkness was not over.",
  "remembered the seventh promise and kept one sky-light from going out.",
  "set the tree relic inside a jewel so its owner’s story would live forever.",
] as const;

function profile(index: number, input: ProductMythInput): ProductWorldProfile {
  const guardian = ELORIA_GUARDIANS[Math.floor(index / archetypes.length)];
  const {
    nameFa: guardianNameFa,
    nameEn: guardianNameEn,
    domainFa,
    domainEn,
    realmFa: homelandFa,
    realmEn: homelandEn,
    symbolFa: symbol,
  } = guardian;
  const characterNameFa = `${archetypes[index % archetypes.length][0]}ِ ${guardianNameFa}`;
  const characterNameEn = `${guardianNameEn}'s ${archetypes[index % archetypes.length][1]}`;
  const piece = input.nameFa.trim();
  return {
    characterNameFa,
    characterNameEn,
    roleFa: `شاگرد و پیام‌آور ${guardianNameFa}`,
    roleEn: `apprentice and messenger of ${guardianNameEn}`,
    homelandFa,
    homelandEn,
    eraFa: "پس از پیمان نخستین",
    eraEn: "after the First Covenant",
    appearanceFa:
      "چهره و پوشش الهام‌گرفته از هنر ایران؛ بدون عناصر فانتزی غربی",
    appearanceEn:
      "Iranian-inspired face and dress; without Western fantasy elements",
    relicMeaningFa: `«${piece}» نشانی از ${guardianNameFa} است و یکی از رشته‌های نقشهٔ درخت خاطره‌ها را نگه می‌دارد.`,
    relicMeaningEn: `“${(input.nameEn ?? input.nameFa).trim()}” carries ${guardianNameEn}'s mark and preserves one thread of the Tree of Memories map.`,
    motherLegendAnchor: "seven-guardians-first-covenant",
    guardianNameFa,
    guardianNameEn,
    guardianDomainFa: domainFa,
    guardianDomainEn: domainEn,
    visualPromptFa: `پرتره سینمایی و واقع‌گرایانه از ${characterNameFa}، شاگرد ${guardianNameFa}، با چهره و پوشش ایرانی، نماد ${symbol}، زیور «${piece}» و فضای ${homelandFa}؛ بدون عناصر رومی، یونانی، عربی، اروپایی یا فانتزی غربی.`,
  };
}

export const ELORIA_MYTH_LIBRARY: readonly ProductMythOutput[] =
  ELORIA_GUARDIANS.flatMap((guardian, guardianIndex) =>
    archetypes.map((archetype, archetypeIndex) => {
      const index = guardianIndex * archetypes.length + archetypeIndex;
      const {
        nameFa: guardianNameFa,
        nameEn: guardianNameEn,
        domainFa,
        domainEn,
        realmFa: homelandFa,
        realmEn: homelandEn,
      } = guardian;
      const mythNameFa = `${archetype[0]}ِ ${guardianNameFa}`;
      const mythNameEn = `${guardianNameEn}'s ${archetype[1]}`;
      return {
        mythKey: `guardian-${String(guardianIndex + 1).padStart(2, "0")}-${String(archetypeIndex + 1).padStart(2, "0")}`,
        mythNameFa,
        mythNameEn,
        legendFa: `«${mythNameFa}» در ${homelandFa} پدیدار شد؛ پیرو ${guardianNameFa} ${hiddenEventsFa[archetypeIndex]} از آن روز این نشان، ${domainFa} و رشته‌ای از پیمان هفت نگهبان را حفظ می‌کند.`,
        legendEn: `“${mythNameEn}” appeared in ${homelandEn}; a follower of ${guardianNameEn} ${hiddenEventsEn[archetypeIndex]} Since then, this Sign has guarded ${domainEn} and one thread of the Seven Guardians’ covenant.`,
        worldProfile: profile(index, {
          nameFa: mythNameFa,
          nameEn: mythNameEn,
        }),
      };
    }),
  );

function stableIndex(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % ELORIA_MYTH_LIBRARY.length;
}
function personalize(
  myth: ProductMythOutput,
  input: ProductMythInput,
): ProductMythOutput {
  const fa = input.nameFa.trim();
  const en = (input.nameEn ?? input.nameFa).trim();
  return {
    ...myth,
    legendFa: myth.legendFa.replace(`«${myth.mythNameFa}»`, `«${fa}»`),
    legendEn: myth.legendEn.replace(`“${myth.mythNameEn}”`, `“${en}”`),
    worldProfile: profile(ELORIA_MYTH_LIBRARY.indexOf(myth), input),
  };
}
export function generateProductMyth(
  input: ProductMythInput,
): ProductMythOutput {
  return personalize(
    ELORIA_MYTH_LIBRARY[
      stableIndex(
        `${input.nameFa}|${input.nameEn ?? ""}|${input.material ?? ""}`,
      )
    ],
    input,
  );
}
export function getProductMythByKey(
  mythKey: string,
  input: ProductMythInput,
): ProductMythOutput | null {
  const myth = ELORIA_MYTH_LIBRARY.find((item) => item.mythKey === mythKey);
  return myth ? personalize(myth, input) : null;
}
export function generateUnusedProductMyth(
  input: ProductMythInput,
  usedKeys: ReadonlySet<string>,
): ProductMythOutput {
  const start = stableIndex(
    `${input.nameFa}|${input.nameEn ?? ""}|${input.material ?? ""}`,
  );
  for (let offset = 0; offset < ELORIA_MYTH_LIBRARY.length; offset += 1) {
    const myth =
      ELORIA_MYTH_LIBRARY[(start + offset) % ELORIA_MYTH_LIBRARY.length];
    if (!usedKeys.has(myth.mythKey)) return personalize(myth, input);
  }
  throw new Error("ELORIA_MYTH_LIBRARY_EXHAUSTED");
}
