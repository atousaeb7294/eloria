type ProductMythInput = { nameFa: string; nameEn?: string; material?: string };

export type ProductMythOutput = {
  mythKey: string;
  mythNameFa: string;
  mythNameEn: string;
  legendFa: string;
  legendEn: string;
  worldProfile: ProductWorldProfile;
};

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
  visualPromptFa: string;
};

const roots = [
  { fa: "آذر", en: "Azar", placeFa: "برج آتشِ آذر", placeEn: "the Tower of Azar", eventFa: "پس از خاموشی سه‌روزهٔ آتش مقدس", eventEn: "after the sacred fire went dark for three days", traceFa: "روی پلکان سنگی پیدا شد", traceEn: "was found on the stone stair" },
  { fa: "مهر", en: "Mehr", placeFa: "تالار مهر", placeEn: "the Hall of Mehr", eventFa: "در شب شکستن پیمان دو خاندان", eventEn: "on the night two houses broke their covenant", traceFa: "در صندوقچهٔ مُهرشده باقی ماند", traceEn: "remained inside a sealed coffer" },
  { fa: "ماه", en: "Mah", placeFa: "چشمهٔ ماه", placeEn: "the Moon Spring", eventFa: "وقتی آب چشمه تا سپیده‌دم از حرکت ایستاد", eventEn: "when the spring stood still until dawn", traceFa: "بر سطح آب دیده شد", traceEn: "was seen resting on the water" },
  { fa: "خور", en: "Khor", placeFa: "ایوان خور", placeEn: "the Khor Terrace", eventFa: "در نخستین طلوع پس از محاصرهٔ شهر", eventEn: "at the first sunrise after the siege", traceFa: "میان خاکستر فانوس‌ها یافت شد", traceEn: "was found among the lantern ash" },
  { fa: "سپند", en: "Sepand", placeFa: "باغ سپند", placeEn: "the Sepand Garden", eventFa: "پس از ناپدیدشدن نگهبان باغ", eventEn: "after the garden keeper vanished", traceFa: "به شاخهٔ سروِ دروازه بسته مانده بود", traceEn: "was left tied to the gate cypress" },
  { fa: "باران", en: "Baran", placeFa: "درهٔ باران", placeEn: "the Valley of Rain", eventFa: "در سالی که باران هفتاد روز بند نیامد", eventEn: "in the year rain fell for seventy days", traceFa: "در خانهٔ آخرین بافندهٔ دره پیدا شد", traceEn: "was found in the last weaver’s house" },
  { fa: "دریا", en: "Darya", placeFa: "بندر نیلگون", placeEn: "the Azure Port", eventFa: "پس از بازگشت کشتی بی‌سرنشین از جنوب", eventEn: "after an unmanned ship returned from the south", traceFa: "میان طناب‌های خیس عرشه باقی مانده بود", traceEn: "was left among the wet ropes on deck" },
  { fa: "البرز", en: "Alborz", placeFa: "گذرگاه البرز", placeEn: "the Alborz Pass", eventFa: "پس از بسته‌شدن راه شمال برای یک زمستان کامل", eventEn: "after the northern road was sealed for an entire winter", traceFa: "زیر سنگ نشانِ گذرگاه کشف شد", traceEn: "was discovered beneath the pass marker" },
  { fa: "پارس", en: "Pars", placeFa: "حیاط سنگی پارس", placeEn: "the Stone Court of Pars", eventFa: "در روزی که نام آخرین خاندان از دیوار پاک شد", eventEn: "the day the final house-name was erased from the wall", traceFa: "پشت سنگ‌نوشته‌ای شکسته پنهان بود", traceEn: "was hidden behind a broken inscription" },
  { fa: "سروش", en: "Soroush", placeFa: "نیایشگاه سروش", placeEn: "the Shrine of Soroush", eventFa: "پس از شنیده‌شدن زنگی که هیچ‌کس آن را به صدا درنیاورده بود", eventEn: "after a bell rang with no hand upon it", traceFa: "کنار درِ بستهٔ نیایشگاه یافت شد", traceEn: "was found beside the sealed door" },
] as const;

const endings = [
  { fa: "دخت", en: "Dokht", ownerFa: "دختری از خاندان خاموش", ownerEn: "a daughter of the Silent House", clueFa: "نام او از همهٔ دفترها تراشیده شده بود", clueEn: "her name had been cut from every record" },
  { fa: "آوا", en: "Ava", ownerFa: "خوانندهٔ بی‌نام دربار", ownerEn: "the court’s nameless singer", clueFa: "آخرین آوازش هرگز نوشته نشد", clueEn: "her final song was never written down" },
  { fa: "گون", en: "Goon", ownerFa: "فرستاده‌ای با جامهٔ سبز", ownerEn: "a messenger in green", clueFa: "هیچ‌کس مقصد او را به یاد نداشت", clueEn: "no one remembered the destination" },
  { fa: "نوش", en: "Noush", ownerFa: "بانوی داروخانهٔ سلطنتی", ownerEn: "the keeper of the royal apothecary", clueFa: "پس از آن شب دیگر در قصر دیده نشد", clueEn: "she was never seen in the palace again" },
  { fa: "چهر", en: "Chehr", ownerFa: "نقاب‌دار جشن زمستان", ownerEn: "the masked guest of the winter feast", clueFa: "پیش از سپیده نقابش را کنار آتش گذاشت و رفت", clueEn: "before dawn, the mask was left beside the fire" },
  { fa: "رخ", en: "Rokh", ownerFa: "سوارِ دروازهٔ شرقی", ownerEn: "the rider of the eastern gate", clueFa: "اسبش بازگشت اما خود او نه", clueEn: "the horse returned, but the rider did not" },
  { fa: "تاب", en: "Tab", ownerFa: "چراغ‌دار برج جنوبی", ownerEn: "the lamp-keeper of the southern tower", clueFa: "فانوسش سه شب پس از ناپدیدشدنش روشن ماند", clueEn: "the lantern burned for three nights after the disappearance" },
  { fa: "بانو", en: "Banoo", ownerFa: "بانوی تالار آینه", ownerEn: "the lady of the Mirror Hall", clueFa: "آخرین کسی بود که پیش از فروپاشی تالار آنجا دیده شد", clueEn: "she was the last person seen there before the hall fell" },
  { fa: "فر", en: "Far", ownerFa: "وارثی که تاج را نپذیرفت", ownerEn: "the heir who refused the crown", clueFa: "صبح تاج‌گذاری تنها مُهر او بر تخت مانده بود", clueEn: "on coronation morning, only the heir’s seal remained on the throne" },
  { fa: "پر", en: "Par", ownerFa: "پیغام‌رسان بلندترین برج", ownerEn: "the messenger of the highest tower", clueFa: "نامه‌ای که حمل می‌کرد هرگز پیدا نشد", clueEn: "the letter being carried was never found" },
] as const;

const iranianAttire = [
  { fa: "پیراهن بلند پارسی با چین‌های منظم، شلوار سواری و شنلی کوتاه با حاشیهٔ سرو", en: "a long pleated Persian tunic, riding trousers and a short cypress-bordered mantle" },
  { fa: "جامهٔ مادیِ آستین‌دار با شلوار باریک، نیم‌تاج زرین و بافت موی ایرانی", en: "a sleeved Median robe with fitted trousers, a gold half-crown and Iranian braided hair" },
  { fa: "ردای ساسانی با نقش سیمرغ، شلوار ابریشمی و کمربند نشان‌دار", en: "a Sasanian robe bearing a Simurgh motif, silk trousers and a sigil belt" },
  { fa: "جامهٔ سواره‌نظام اشکانی با یقهٔ بسته، شلوار چین‌دار و چکمهٔ چرمی", en: "a high-collared Parthian riding coat, pleated trousers and leather boots" },
] as const;

function worldProfile(mythKey: string, input: ProductMythInput): ProductWorldProfile {
  const numeric = Math.max(0, Number.parseInt(mythKey.slice(-3), 10) - 1);
  const root = roots[Math.floor(numeric / endings.length) % roots.length];
  const ending = endings[numeric % endings.length];
  const attire = iranianAttire[numeric % iranianAttire.length];
  const characterNameFa = `${root.fa}${ending.fa}`;
  const characterNameEn = `${root.en}${ending.en}`;
  const piece = input.nameFa.trim();
  return {
    characterNameFa,
    characterNameEn,
    roleFa: ending.ownerFa,
    roleEn: ending.ownerEn,
    homelandFa: root.placeFa,
    homelandEn: root.placeEn,
    eraFa: ["روزگار هخامنشیِ متأخر", "روزگار اشکانی", "روزگار ساسانی", "سال‌های پایانی الوریا"][numeric % 4],
    eraEn: ["late Achaemenid age", "Parthian age", "Sasanian age", "Eloria's final years"][numeric % 4],
    appearanceFa: `چهره‌ای ایرانی با مو و چشم تیره؛ ${attire.fa}`,
    appearanceEn: `Iranian features with dark hair and eyes; ${attire.en}`,
    relicMeaningFa: `«${piece}» نشان شخصی او و شاهد واقعهٔ ${root.placeFa} است؛ روایت این اثر مستقل خوانده می‌شود و یکی از نشانه‌های پراکنده‌شده در شب بسته‌شدن دروازه‌های الوریاست.`,
    relicMeaningEn: `“${(input.nameEn ?? input.nameFa).trim()}” is this character's personal sign and a witness to the event at ${root.placeEn}; its story stands alone while belonging to the signs scattered on the night Eloria's gates closed.`,
    motherLegendAnchor: "night-of-the-sealed-gates",
    visualPromptFa: `پرتره سینمایی و واقع‌گرایانه از ${characterNameFa}، ${ending.ownerFa}، با چهره و آناتومی ایرانی، ${attire.fa}، زیور ${piece}، معماری و نقوش ایران باستان؛ بدون عناصر رومی، یونانی، عربی، اروپایی یا فانتزی غربی.`,
  };
}

export const ELORIA_MYTH_LIBRARY: readonly ProductMythOutput[] = roots.flatMap(
  (root, rootIndex) => endings.map((ending, endingIndex) => {
    const key = `iranian-myth-${String(rootIndex * 10 + endingIndex + 1).padStart(3, "0")}`;
    const mythNameFa = `${root.fa}${ending.fa}`;
    const mythNameEn = `${root.en}${ending.en}`;
    return {
      mythKey: key,
      mythNameFa,
      mythNameEn,
      legendFa: `${mythNameFa} به ${ending.ownerFa} تعلق داشت؛ ${root.eventFa}، در ${root.placeFa} ${root.traceFa}. ${ending.clueFa}.`,
      legendEn: `${mythNameEn} belonged to ${ending.ownerEn}; ${root.eventEn}, it ${root.traceEn} at ${root.placeEn}. ${ending.clueEn}.`,
      worldProfile: worldProfile(key, { nameFa: mythNameFa, nameEn: mythNameEn }),
    };
  }),
);

function stableIndex(value: string): number {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % ELORIA_MYTH_LIBRARY.length;
}

function personalize(myth: ProductMythOutput, input: ProductMythInput): ProductMythOutput {
  const faName = input.nameFa.trim();
  const enName = (input.nameEn ?? input.nameFa).trim();
  return {
    ...myth,
    legendFa: myth.legendFa.replace(myth.mythNameFa, `«${faName}»`),
    legendEn: myth.legendEn.replace(myth.mythNameEn, `“${enName}”`),
    worldProfile: worldProfile(myth.mythKey, input),
  };
}

export function generateProductMyth(input: ProductMythInput): ProductMythOutput {
  return personalize(ELORIA_MYTH_LIBRARY[stableIndex(`${input.nameFa}|${input.nameEn ?? ""}|${input.material ?? ""}`)], input);
}

export function generateUnusedProductMyth(input: ProductMythInput, usedKeys: ReadonlySet<string>): ProductMythOutput {
  const start = stableIndex(`${input.nameFa}|${input.nameEn ?? ""}|${input.material ?? ""}`);
  for (let offset = 0; offset < ELORIA_MYTH_LIBRARY.length; offset += 1) {
    const candidate = ELORIA_MYTH_LIBRARY[(start + offset) % ELORIA_MYTH_LIBRARY.length];
    if (!usedKeys.has(candidate.mythKey)) return personalize(candidate, input);
  }
  throw new Error("ELORIA_MYTH_LIBRARY_EXHAUSTED");
}
