type ProductMythInput = {
  nameFa: string;
  nameEn?: string;
};

type ProductMythOutput = {
  mythNameFa: string;
  mythNameEn: string;
  legendFa: string;
  legendEn: string;
};

const myths = [
  {
    fa: "آذرگون",
    en: "Azargoon",
    legendFa:
      "روایت شده که آذرگون از شعله‌های نخستین آتش زاده شد و نگهبان شکوه و بخت نیک بود.",
    legendEn:
      "Born from the first celestial flames, Azargoon guarded glory and fortune.",
  },
  {
    fa: "ماه‌تاب",
    en: "Mahtaab",
    legendFa:
      "افسانه‌ها می‌گویند ماه‌تاب هدیه‌ای از روشنای ماه برای دل‌های جاودانه بود.",
    legendEn:
      "Legends tell that Mahtaab was a gift from moonlight to eternal hearts.",
  },
  {
    fa: "زرین‌فر",
    en: "Zarrinfer",
    legendFa:
      "زرین‌فر نامی بود که برای پاسداران هنر و زیبایی در سرزمین‌های کهن برگزیده می‌شد.",
    legendEn:
      "Zarrinfer was the ancient name given to guardians of beauty and art.",
  },
];

export function generateProductMyth(
  input: ProductMythInput,
): ProductMythOutput {
  const index =
    Math.floor(Math.random() * myths.length);

  const myth = myths[index];

  return {
    mythNameFa: myth.fa,
    mythNameEn: myth.en,
    legendFa:
      `${myth.legendFa} این افسانه برای «${input.nameFa}» نگاشته شد.`,
    legendEn:
      `${myth.legendEn} This legend was written for "${input.nameEn ?? input.nameFa}".`,
  };
}
