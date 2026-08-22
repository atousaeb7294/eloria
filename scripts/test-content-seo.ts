import assert from "node:assert/strict";

import { buildContentSeoHealth } from "@/lib/content-seo-health";
import {
  articleSeoScore,
  createProductAssistedArticleDraft,
  isValidArticleSlug,
  normalizeArticleSlug,
  wordCount,
} from "@/lib/content-studio";

const draft = createProductAssistedArticleDraft({
  id: "5f9c0f25-7c5a-4bcd-9b1a-746c48dcd2a0",
  slug: "moonlight-necklace",
  nameFa: "گردنبند مهتاب",
  nameEn: "Moonlight Necklace",
  descriptionFa:
    "گردنبند مهتاب با فرمی ظریف و مناسب استفادهٔ روزمره طراحی شده است.",
  descriptionEn:
    "Moonlight Necklace is designed with a refined form for everyday wear.",
  material: "GOLD",
  purity: "۱۸ عیار",
  metalWeight: {
    toString: () => "3.250",
  },
  collection: {
    id: "a4bb35ee-550e-44de-8343-3f0ac9a7f9ec",
    slug: "necklaces",
    nameFa: "گردنبندها",
    nameEn: "Necklaces",
  },
  images: [
    {
      imageUrl: "/images/collections/necklace.jpg",
      isPrimary: true,
      displayOrder: 0,
    },
  ],
});

assert.equal(draft.slug, "guide-moonlight-necklace");
assert.equal(draft.origin, "PRODUCT_ASSISTED");
assert.equal(draft.sourceProductId, "5f9c0f25-7c5a-4bcd-9b1a-746c48dcd2a0");
assert.ok(draft.contentFa.includes("قیمت قطعی"));
assert.ok(draft.contentEn.includes("no claim about a fixed price"));
assert.ok(
  wordCount(draft.contentFa) >= 140,
  "Persian product-assisted draft should be substantial.",
);
assert.ok(
  wordCount(draft.contentEn) >= 120,
  "English product-assisted draft should be substantial.",
);

const score = articleSeoScore(draft);
assert.ok(
  score >= 80,
  "Complete product-assisted draft should start from a healthy editorial score.",
);

assert.equal(
  normalizeArticleSlug("  A Practical — Guide!  "),
  "a-practical-guide",
);
assert.equal(isValidArticleSlug("راهنمای-انتخاب-طلا"), true);
assert.equal(isValidArticleSlug("--bad"), false);

const healthy = buildContentSeoHealth({
  publishedArticleCount: 4,
  draftArticleCount: 1,
  activeProductCount: 10,
  productsMissingDescription: 0,
  productsMissingImageAlt: 0,
  stalePublishedArticleCount: 0,
  averagePublishedArticleScore: 92,
});
assert.equal(healthy.overallScore, 100);
assert.equal(healthy.issues.length, 0);

const unhealthy = buildContentSeoHealth({
  publishedArticleCount: 0,
  draftArticleCount: 10,
  activeProductCount: 10,
  productsMissingDescription: 5,
  productsMissingImageAlt: 3,
  stalePublishedArticleCount: 0,
  averagePublishedArticleScore: 0,
});
assert.ok(unhealthy.overallScore < 60);
assert.ok(
  unhealthy.issues.some((issue) => issue.id === "NO_PUBLISHED_ARTICLES"),
);
assert.ok(unhealthy.issues.some((issue) => issue.id === "DRAFT_BACKLOG"));

console.log("PASS  Content drafts, SEO scoring, and health priorities");
