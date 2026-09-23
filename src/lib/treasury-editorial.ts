export const treasuryEditorial = [
  { slug: "gold", fa: "گنجینهٔ طلا", en: "Gold treasury", titleFa: "تاب مهر", titleEn: "Sun woven", descriptionFa: "گرمای طلا، میان گره‌های ظریف؛ یادگاری از آفتاب ایران.", descriptionEn: "Warm gold held in fine knots, touched by the Persian sun." },
  { slug: "silver", fa: "گنجینهٔ نقره", en: "Silver treasury", titleFa: "نور ماه", titleEn: "Moon thread", descriptionFa: "درخشش آرام نقره در بافتی به ظرافت نور ماه.", descriptionEn: "Quiet silver, nestled in a weave as delicate as moonlight." },
  { slug: "weave", fa: "گنجینهٔ بافت", en: "Woven treasury", titleFa: "تار جان", titleEn: "Living threads", descriptionFa: "گره به گره، با دست؛ بافت ظریف جواهری با نقش‌ونگار ایرانی.", descriptionEn: "Fine jewelry knotwork, made by hand with a Persian soul." },
] as const;
export type TreasurySlug = typeof treasuryEditorial[number]["slug"];
