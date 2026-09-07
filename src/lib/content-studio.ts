import type {
  ContentArticleOrigin,
  ContentArticleStatus,
  MaterialType,
} from "@/generated/prisma/client";

export const contentArticleStatuses = [
  "DRAFT",
  "IN_REVIEW",
  "PUBLISHED",
  "ARCHIVED",
] as const satisfies readonly ContentArticleStatus[];

export type ContentArticleStatusValue = (typeof contentArticleStatuses)[number];

export const contentArticleOrigins = [
  "MANUAL",
  "PRODUCT_ASSISTED",
] as const satisfies readonly ContentArticleOrigin[];

export type ContentArticleOriginValue = (typeof contentArticleOrigins)[number];

export const articleStatusLabels: Record<ContentArticleStatusValue, string> = {
  DRAFT: "پیش‌نویس",
  IN_REVIEW: "در انتظار تأیید",
  PUBLISHED: "منتشرشده",
  ARCHIVED: "بایگانی‌شده",
};

export const articleOriginLabels: Record<ContentArticleOriginValue, string> = {
  MANUAL: "نوشتهٔ دستی",
  PRODUCT_ASSISTED: "پیش‌نویس مبتنی بر محصول",
};

export type ContentArticleDraft = {
  slug: string;
  origin: ContentArticleOriginValue;
  sourceProductId: string | null;
  sourceCollectionId: string | null;
  titleFa: string;
  titleEn: string;
  excerptFa: string;
  excerptEn: string;
  contentFa: string;
  contentEn: string;
  seoTitleFa: string;
  seoTitleEn: string;
  seoDescriptionFa: string;
  seoDescriptionEn: string;
  focusKeywordFa: string;
  focusKeywordEn: string;
  coverImageUrl: string | null;
};

export type ProductForArticleDraft = {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string | null;
  descriptionEn: string | null;
  material: MaterialType;
  purity: string | null;
  metalWeight: {
    toString(): string;
  } | null;
  collection: {
    id: string;
    slug: string;
    nameFa: string;
    nameEn: string;
  } | null;
  images: Array<{
    imageUrl: string;
    isPrimary: boolean;
    displayOrder: number;
  }>;
};

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function firstSentence(value: string, fallback: string): string {
  const normalized = collapseWhitespace(value);

  if (!normalized) {
    return fallback;
  }

  const boundary = normalized.search(/[.!؟!]/u);

  return boundary >= 24 ? normalized.slice(0, boundary + 1) : normalized;
}

function materialLabel(material: MaterialType, locale: "fa" | "en"): string {
  if (material === "SILVER") {
    return locale === "fa" ? "نقره" : "silver";
  }

  return locale === "fa" ? "طلا" : "gold";
}

function productWeight(
  product: ProductForArticleDraft,
  locale: "fa" | "en",
): string | null {
  if (!product.metalWeight) {
    return null;
  }

  const raw = product.metalWeight.toString();

  return locale === "fa" ? `${raw} گرم` : `${raw} g`;
}

function primaryImage(product: ProductForArticleDraft): string | null {
  return (
    product.images
      .slice()
      .sort(
        (left, right) =>
          Number(right.isPrimary) - Number(left.isPrimary) ||
          left.displayOrder - right.displayOrder,
      )
      .at(0)?.imageUrl ?? null
  );
}

export function normalizeArticleSlug(value: string): string {
  const compact = value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140)
    .replace(/-+$/g, "");

  return compact;
}

export function isValidArticleSlug(value: string): boolean {
  return (
    value.length >= 3 &&
    value.length <= 140 &&
    /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(value)
  );
}

export function wordCount(value: string): number {
  return collapseWhitespace(value).split(/\s+/u).filter(Boolean).length;
}

export function articleSeoScore(input: {
  titleFa: string;
  titleEn: string;
  excerptFa: string;
  excerptEn: string;
  contentFa: string;
  contentEn: string;
  seoTitleFa?: string | null;
  seoTitleEn?: string | null;
  seoDescriptionFa?: string | null;
  seoDescriptionEn?: string | null;
  focusKeywordFa?: string | null;
  focusKeywordEn?: string | null;
  coverImageUrl?: string | null;
  sourceProductId?: string | null;
  sourceCollectionId?: string | null;
}): number {
  const titleIsUseful =
    input.titleFa.trim().length >= 12 && input.titleEn.trim().length >= 12;
  const excerptsAreUseful =
    input.excerptFa.trim().length >= 45 && input.excerptEn.trim().length >= 45;
  const bodyIsUseful =
    wordCount(input.contentFa) >= 140 && wordCount(input.contentEn) >= 120;
  const seoTitlesAreUseful =
    Boolean(input.seoTitleFa?.trim()) && Boolean(input.seoTitleEn?.trim());
  const seoDescriptionsAreUseful =
    Boolean(input.seoDescriptionFa?.trim()) &&
    Boolean(input.seoDescriptionEn?.trim());
  const keywordsAreUseful =
    Boolean(input.focusKeywordFa?.trim()) &&
    Boolean(input.focusKeywordEn?.trim());
  const hasTraceableSource =
    Boolean(input.sourceProductId) || Boolean(input.sourceCollectionId);

  return [
    titleIsUseful ? 14 : 0,
    excerptsAreUseful ? 12 : 0,
    bodyIsUseful ? 30 : 0,
    seoTitlesAreUseful ? 12 : 0,
    seoDescriptionsAreUseful ? 12 : 0,
    keywordsAreUseful ? 8 : 0,
    input.coverImageUrl?.trim() ? 6 : 0,
    hasTraceableSource ? 6 : 0,
  ].reduce((total, part) => total + part, 0);
}

export function createEmptyArticleDraft(): ContentArticleDraft {
  return {
    slug: "",
    origin: "MANUAL",
    sourceProductId: null,
    sourceCollectionId: null,
    titleFa: "",
    titleEn: "",
    excerptFa: "",
    excerptEn: "",
    contentFa:
      "# عنوان مقاله\n\nمقدمهٔ دقیق و قابل‌بررسی مقاله را این‌جا بنویسید.\n\n## نکته‌های اصلی\n\n- یک نکتهٔ واقعی و مفید برای خریدار\n- توضیحی که با مشخصات محصولات الوریا هم‌خوان باشد\n\n## جمع‌بندی\n\nپیش از انتشار، عنوان سئو، توضیح سئو و هر دو زبان را بازبینی کنید.",
    contentEn:
      "# Article title\n\nWrite a precise, verifiable introduction here.\n\n## Key points\n\n- One practical and factual point for the reader\n- Copy that remains consistent with Eloria product details\n\n## Summary\n\nReview both languages, the SEO title, and the SEO description before publishing.",
    seoTitleFa: "",
    seoTitleEn: "",
    seoDescriptionFa: "",
    seoDescriptionEn: "",
    focusKeywordFa: "",
    focusKeywordEn: "",
    coverImageUrl: null,
  };
}

export function createProductAssistedArticleDraft(
  product: ProductForArticleDraft,
): ContentArticleDraft {
  const materialFa = materialLabel(product.material, "fa");
  const materialEn = materialLabel(product.material, "en");
  const weightFa = productWeight(product, "fa");
  const weightEn = productWeight(product, "en");
  const collectionFa = product.collection?.nameFa ?? "مجموعهٔ الوریا";
  const collectionEn = product.collection?.nameEn ?? "the Eloria collection";
  const descriptionFa = firstSentence(
    product.descriptionFa ?? "",
    `${product.nameFa} با تمرکز بر جزئیات ثبت‌شده در فروشگاه الوریا معرفی می‌شود.`,
  );
  const descriptionEn = firstSentence(
    product.descriptionEn ?? "",
    `${product.nameEn} is introduced through the details recorded in the Eloria store.`,
  );
  const factsFa = [
    `- جنس ثبت‌شده: ${materialFa}`,
    product.purity ? `- عیار یا خلوص ثبت‌شده: ${product.purity}` : null,
    weightFa
      ? `- وزن فلز ثبت‌شده: ${weightFa}`
      : "- وزن و قیمت نهایی در صفحهٔ محصول، پیش از ثبت سفارش، دوباره بررسی می‌شود.",
    `- مجموعه: ${collectionFa}`,
  ]
    .filter(Boolean)
    .join("\n");
  const factsEn = [
    `- Recorded material: ${materialEn}`,
    product.purity ? `- Recorded purity: ${product.purity}` : null,
    weightEn
      ? `- Recorded metal weight: ${weightEn}`
      : "- The final weight and price are checked again on the product page before an order is placed.",
    `- Collection: ${collectionEn}`,
  ]
    .filter(Boolean)
    .join("\n");
  const focusKeywordFa = `${product.nameFa} ${materialFa}`.slice(0, 120);
  const focusKeywordEn = `${product.nameEn} ${materialEn}`.slice(0, 120);

  return {
    slug: normalizeArticleSlug(`guide-${product.slug}`),
    origin: "PRODUCT_ASSISTED",
    sourceProductId: product.id,
    sourceCollectionId: product.collection?.id ?? null,
    titleFa: `راهنمای شناخت ${product.nameFa}`.slice(0, 180),
    titleEn: `A closer look at ${product.nameEn}`.slice(0, 180),
    excerptFa:
      `این راهنما با اتکا به مشخصات ثبت‌شدهٔ ${product.nameFa} در فروشگاه الوریا، نکته‌های مهم انتخاب و بررسی آن را مرور می‌کند.`.slice(
        0,
        360,
      ),
    excerptEn:
      `This guide uses the recorded details of ${product.nameEn} to explain the important points to review before choosing it.`.slice(
        0,
        360,
      ),
    contentFa: `# راهنمای شناخت ${product.nameFa}

این پیش‌نویس از اطلاعاتی ساخته شده است که اکنون برای ${product.nameFa} در فروشگاه الوریا ثبت شده‌اند. پیش از انتشار، مدیر سایت باید متن، موجودی و هر مشخصه‌ای را که ممکن است تغییر کرده باشد بازبینی کند.

## این قطعه چه ویژگی‌هایی دارد؟

${descriptionFa}

مشخصات این قطعه به انتخاب آگاهانه کمک می‌کند، اما جای بررسی صفحهٔ محصول در زمان سفارش را نمی‌گیرد. به‌خصوص در جواهرات، وزن، موجودی و قیمت می‌توانند با به‌روزرسانی محصول تغییر کنند.

## مشخصات قابل بررسی

${factsFa}

## برای انتخاب دقیق‌تر چه چیزهایی را بررسی کنیم؟

پیش از انتخاب ${product.nameFa}، به تناسب فرم آن با استفادهٔ روزمره یا مناسبت مورد نظر، جزئیات طراحی، جنس و خلوص ثبت‌شده توجه کنید. اگر نیاز شما به استفادهٔ طولانی‌مدت، هدیه یا ست‌کردن با زیورآلات دیگر مربوط است، تصویرهای محصول و توضیحات به‌روز آن را هم ببینید.

این راهنما عمداً دربارهٔ قیمت قطعی یا موجودی قطعی ادعایی نمی‌کند. این دو مورد باید در همان لحظه از صفحهٔ محصول و روند خرید بررسی شوند تا تصمیم بر پایهٔ اطلاعات زندهٔ فروشگاه باشد.

## پیش از ثبت سفارش

برای ادامه، صفحهٔ ${product.nameFa} را باز کنید و مشخصات، تصویرها، قیمت به‌روز و وضعیت موجودی را دوباره کنترل کنید. اگر پرسشی باقی ماند، از مسیر ارتباطی الوریا کمک بگیرید تا انتخاب شما با اطلاعات کامل انجام شود.

## یادداشت تحریریه

این متن یک پیش‌نویس کمکی و قابل‌ویرایش است؛ انتشار آن فقط پس از بررسی انسانی در پنل محتوا مجاز است.`,
    contentEn: `# A closer look at ${product.nameEn}

This draft is built from the details currently recorded for ${product.nameEn} in the Eloria store. Before publishing, the site administrator must review the copy, availability, and any specification that may have changed.

## What is recorded for this piece?

${descriptionEn}

These details support an informed choice, but they do not replace checking the product page when placing an order. With jewellery, weight, availability, and price can change as the product is updated.

## Details to review

${factsEn}

## How to make a more considered choice

Before choosing ${product.nameEn}, consider whether its form fits everyday wear or a specific occasion, then review the recorded material, purity, design details, and current product imagery. If it is intended as a gift or part of a set, compare those details with the other pieces you plan to wear.

This guide deliberately makes no claim about a fixed price or guaranteed availability. Both must be checked on the live product page and during checkout so that the decision is based on current store information.

## Before placing an order

Open the ${product.nameEn} product page and review its latest specifications, photographs, live price, and availability. If a question remains, use Eloria's contact route so that the choice can be made with complete information.

## Editorial note

This is an editable assistance draft. It can only be published after human review in the content studio.`,
    seoTitleFa: `راهنمای ${product.nameFa} | الوریا`.slice(0, 180),
    seoTitleEn: `${product.nameEn}: a buying guide | ELORIA`.slice(0, 180),
    seoDescriptionFa:
      `راهنمای بررسی مشخصات، جنس و جزئیات ${product.nameFa} پیش از انتخاب؛ اطلاعات زندهٔ قیمت و موجودی را در صفحهٔ محصول الوریا ببینید.`.slice(
        0,
        180,
      ),
    seoDescriptionEn:
      `Review the material, details, and live product information for ${product.nameEn} before choosing it from Eloria.`.slice(
        0,
        180,
      ),
    focusKeywordFa,
    focusKeywordEn,
    coverImageUrl: primaryImage(product),
  };
}
