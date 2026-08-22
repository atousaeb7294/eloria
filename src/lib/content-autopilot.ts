import { Prisma } from "@/generated/prisma/client";
import {
  createProductAssistedArticleDraft,
  type ProductForArticleDraft,
} from "@/lib/content-studio";
import { prisma, withDatabaseRetry } from "@/lib/prisma";

type Env = Record<string, string | undefined>;

export type ContentAutopilotSettings = {
  enabled: boolean;
  dailyLimit: number;
};

export function getContentAutopilotSettings(
  env: Env = process.env,
): ContentAutopilotSettings {
  const requestedLimit = Number.parseInt(
    env.ELORIA_CONTENT_AUTOPILOT_DAILY_LIMIT?.trim() ?? "1",
    10,
  );

  return {
    enabled:
      (env.ELORIA_CONTENT_AUTOPILOT_ENABLED ?? "true")
        .trim()
        .toLowerCase() === "true",
    dailyLimit:
      Number.isInteger(requestedLimit) && requestedLimit >= 0
        ? Math.min(requestedLimit, 3)
        : 1,
  };
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function usableSource(product: ProductForArticleDraft): boolean {
  return (
    (product.descriptionFa?.trim().length ?? 0) >= 40 &&
    (product.descriptionEn?.trim().length ?? 0) >= 40 &&
    product.images.some((image) => Boolean(image.imageUrl.trim()))
  );
}

export async function runContentAutopilot() {
  const settings = getContentAutopilotSettings();

  if (!settings.enabled || settings.dailyLimit === 0) {
    return {
      ...settings,
      created: 0,
      skipped: 0,
      reason: "DISABLED" as const,
    };
  }

  const since = new Date(Date.now() - 20 * 60 * 60 * 1_000);
  const alreadyCreated = await prisma.contentArticle.count({
    where: {
      origin: "PRODUCT_ASSISTED",
      createdAt: { gte: since },
    },
  });
  const available = Math.max(0, settings.dailyLimit - alreadyCreated);

  if (available === 0) {
    return {
      ...settings,
      created: 0,
      skipped: 0,
      reason: "DAILY_LIMIT" as const,
    };
  }

  const candidates = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      articles: {
        none: {
          status: { not: "ARCHIVED" },
        },
      },
    },
    orderBy: [
      { isFeatured: "desc" },
      { updatedAt: "desc" },
    ],
    take: Math.max(available * 5, 5),
    select: {
      id: true,
      slug: true,
      nameFa: true,
      nameEn: true,
      descriptionFa: true,
      descriptionEn: true,
      material: true,
      purity: true,
      metalWeight: true,
      collection: {
        select: {
          id: true,
          slug: true,
          nameFa: true,
          nameEn: true,
        },
      },
      images: {
        orderBy: [
          { isPrimary: "desc" },
          { displayOrder: "asc" },
        ],
        select: {
          imageUrl: true,
          isPrimary: true,
          displayOrder: true,
        },
      },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    if (created >= available) break;
    if (!usableSource(candidate)) {
      skipped += 1;
      continue;
    }

    try {
      await withDatabaseRetry(() =>
        prisma.$transaction(async (transaction) => {
          const existing = await transaction.contentArticle.findFirst({
            where: {
              sourceProductId: candidate.id,
              status: { not: "ARCHIVED" },
            },
            select: { id: true },
          });

          if (existing) {
            return false;
          }

          const draft = createProductAssistedArticleDraft(candidate);
          const article = await transaction.contentArticle.create({
            data: {
              ...draft,
              status: "DRAFT",
              seoTitleFa: draft.seoTitleFa || null,
              seoTitleEn: draft.seoTitleEn || null,
              seoDescriptionFa: draft.seoDescriptionFa || null,
              seoDescriptionEn: draft.seoDescriptionEn || null,
              focusKeywordFa: draft.focusKeywordFa || null,
              focusKeywordEn: draft.focusKeywordEn || null,
            },
            select: { id: true },
          });

          await transaction.contentArticleAuditEvent.create({
            data: {
              articleId: article.id,
              eventType: "AUTO_PRODUCT_DRAFT_CREATED",
              payload: json({
                sourceProductId: candidate.id,
                sourceProductSlug: candidate.slug,
                policy: "FACTUAL_PRODUCT_DRAFT_REQUIRES_REVIEW",
              }),
            },
          });

          return true;
        }),
      ).then((wasCreated) => {
        if (wasCreated) created += 1;
        else skipped += 1;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        skipped += 1;
        continue;
      }

      throw error;
    }
  }

  return {
    ...settings,
    created,
    skipped,
    reason: "COMPLETED" as const,
  };
}
