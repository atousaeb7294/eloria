type ProductMythInput = {
  nameFa: string;
  nameEn?: string;
  material?: string;
};

export type ProductMythOutput = {
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
      "در روایت‌های سرزمین کهن، آذرگون نشانی از روشنایی بود که میان گره‌های دست‌بافت جای می‌گرفت و با درخشش فلز و سنگ، راه خود را پیدا می‌کرد.",
    legendEn:
      "In the tales of the ancient land, Azargoon was a light carried through handwoven knots, finding its path beside precious metal and stone.",
  },
  {
    fa: "ماه‌تاب",
    en: "Mahtaab",
    legendFa:
      "می‌گویند ماه‌تاب از رشته‌هایی شکل گرفت که هنرمندان الوریا با صبر به هم گره می‌زدند و در دل آن، قطعه‌ای درخشان را چون یادگاری از آسمان می‌نشاندند.",
    legendEn:
      "Mahtaab is said to have been formed from patient handwoven threads, holding a luminous piece at its heart like a memory of the sky.",
  },
  {
    fa: "زرین‌فر",
    en: "Zarrinfer",
    legendFa:
      "زرین‌فر در افسانه‌های الوریا نام پیوندی بود میان هنر دست و فلز گران‌بها؛ جایی که هر گره بخشی از داستان و هر درخشش مهر پایانی آن بود.",
    legendEn:
      "In Eloria's legends, Zarrinfer named the bond between handcraft and precious metal, where every knot carried a story and every gleam sealed it.",
  },
  {
    fa: "سنگ‌آوا",
    en: "Sangava",
    legendFa:
      "سنگ‌آوا از قصهٔ جواهرهایی می‌آید که میان بافت‌های مکرومه آرام می‌گرفتند؛ گویی سنگ، طلا و نخ سه زبان متفاوت برای روایت یک یادگار بودند.",
    legendEn:
      "Sangava comes from the tale of gems resting within macrame weaves, as if stone, gold and thread were three languages telling one keepsake.",
  },
];

function stableIndex(value: string): number {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % myths.length;
}

export function generateProductMyth(input: ProductMythInput): ProductMythOutput {
  const myth = myths[stableIndex(`${input.nameFa}|${input.nameEn ?? ""}|${input.material ?? ""}`)];
  return {
    mythNameFa: myth.fa,
    mythNameEn: myth.en,
    legendFa: `${myth.legendFa} این روایت برای «${input.nameFa}» در دفتر آثار الوریا ثبت شده است.`,
    legendEn: `${myth.legendEn} This story is recorded in Eloria's book of creations for “${input.nameEn ?? input.nameFa}”.`,
  };
}
