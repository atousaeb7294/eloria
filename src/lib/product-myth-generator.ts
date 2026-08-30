type ProductMythInput = { nameFa: string; nameEn?: string; material?: string };

export type ProductMythOutput = {
  mythKey: string;
  mythNameFa: string;
  mythNameEn: string;
  legendFa: string;
  legendEn: string;
};

const roots = [
  { fa: "آذر", en: "Azar", symbol: "آتش پاک", place: "آتشکده‌ای بر فراز کوه" },
  { fa: "مهر", en: "Mehr", symbol: "پیمان و روشنایی", place: "دشت‌های روشن پارس" },
  { fa: "ماه", en: "Mah", symbol: "نور آرام شب", place: "کنار چشمه‌ای زیر ماه" },
  { fa: "خور", en: "Khor", symbol: "گرمای خورشید", place: "ایوانی رو به سپیده‌دم" },
  { fa: "سپند", en: "Sepand", symbol: "پاکی و نگهبانی", place: "باغی پوشیده از اسپند" },
  { fa: "باران", en: "Baran", symbol: "باروری زمین", place: "دامنه‌های سبز البرز" },
  { fa: "دریا", en: "Darya", symbol: "ژرفای آب", place: "کرانه‌های نیلگون جنوب" },
  { fa: "البرز", en: "Alborz", symbol: "استواری کوه", place: "گذرگاه‌های بلند البرز" },
  { fa: "پارس", en: "Pars", symbol: "شکوه سرزمین ایران", place: "سنگ‌نگاره‌های پارس" },
  { fa: "سروش", en: "Soroush", symbol: "پیام نیک", place: "بامداد خاموش یک نیایشگاه" },
] as const;

const endings = [
  { fa: "دخت", en: "Dokht", gift: "دل را از فراموشی نگه می‌داشت" },
  { fa: "آوا", en: "Ava", gift: "صدای آرزوهای نیک را بازمی‌گرداند" },
  { fa: "گون", en: "Goon", gift: "رنگ امید را در روزهای دشوار زنده می‌کرد" },
  { fa: "نوش", en: "Noush", gift: "شادی آرام را به خانه می‌آورد" },
  { fa: "چهر", en: "Chehr", gift: "چهره راستین صاحبش را روشن می‌ساخت" },
  { fa: "رخ", en: "Rokh", gift: "جرئت آغاز دوباره می‌بخشید" },
  { fa: "تاب", en: "Tab", gift: "نور پنهان درون را آشکار می‌کرد" },
  { fa: "بانو", en: "Banoo", gift: "نشانه خرد و وقار بود" },
  { fa: "فر", en: "Far", gift: "فرّه نیک و سربلندی را یادآوری می‌کرد" },
  { fa: "پر", en: "Par", gift: "راه خیال را تا آسمان می‌گشود" },
] as const;

export const ELORIA_MYTH_LIBRARY: readonly ProductMythOutput[] = roots.flatMap(
  (root, rootIndex) => endings.map((ending, endingIndex) => {
    const key = `iranian-myth-${String(rootIndex * 10 + endingIndex + 1).padStart(3, "0")}`;
    const mythNameFa = `${root.fa}${ending.fa}`;
    const mythNameEn = `${root.en}${ending.en}`;
    return {
      mythKey: key,
      mythNameFa,
      mythNameEn,
      legendFa: `در افسانه‌های خیالی الوریا، «${mythNameFa}» یادگاری از ${root.place} بود؛ نشانی از ${root.symbol} که می‌گفتند ${ending.gift}.`,
      legendEn: `In Eloria's imagined Persian tales, “${mythNameEn}” was a keepsake of ancient Iran, carrying a distinct blessing of light and memory.`,
    };
  }),
);

function stableIndex(value: string): number {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % ELORIA_MYTH_LIBRARY.length;
}

function personalize(myth: ProductMythOutput, input: ProductMythInput): ProductMythOutput {
  return {
    ...myth,
    legendFa: `${myth.legendFa} این روایت یکتا برای «${input.nameFa}» در دفتر آثار الوریا ثبت شده است.`,
    legendEn: `${myth.legendEn} This one-of-a-kind story is recorded for “${input.nameEn ?? input.nameFa}” in Eloria's book of creations.`,
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
