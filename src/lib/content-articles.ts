import { prisma, withDatabaseRetry } from "@/lib/prisma";

export async function getPublishedArticles(take = 36) {
  return withDatabaseRetry(() =>
    prisma.contentArticle.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          not: null,
        },
      },
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: Math.min(Math.max(take, 1), 100),
      select: {
        slug: true,
        titleFa: true,
        titleEn: true,
        excerptFa: true,
        excerptEn: true,
        coverImageUrl: true,
        publishedAt: true,
        updatedAt: true,
        focusKeywordFa: true,
        focusKeywordEn: true,
        sourceProduct: {
          select: {
            slug: true,
            nameFa: true,
            nameEn: true,
          },
        },
      },
    }),
  );
}

export async function getPublishedArticleBySlug(slug: string) {
  return withDatabaseRetry(() =>
    prisma.contentArticle.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        publishedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        slug: true,
        titleFa: true,
        titleEn: true,
        excerptFa: true,
        excerptEn: true,
        contentFa: true,
        contentEn: true,
        seoTitleFa: true,
        seoTitleEn: true,
        seoDescriptionFa: true,
        seoDescriptionEn: true,
        focusKeywordFa: true,
        focusKeywordEn: true,
        coverImageUrl: true,
        publishedAt: true,
        updatedAt: true,
        sourceProduct: {
          select: {
            slug: true,
            nameFa: true,
            nameEn: true,
          },
        },
        sourceCollection: {
          select: {
            slug: true,
            nameFa: true,
            nameEn: true,
          },
        },
      },
    }),
  );
}

export async function getAdminContentArticle(id: string) {
  return withDatabaseRetry(() =>
    prisma.contentArticle.findUnique({
      where: {
        id,
      },
      include: {
        sourceProduct: {
          select: {
            slug: true,
            nameFa: true,
            nameEn: true,
          },
        },
        sourceCollection: {
          select: {
            slug: true,
            nameFa: true,
            nameEn: true,
          },
        },
        auditEvents: {
          orderBy: {
            createdAt: "desc",
          },
          take: 12,
        },
      },
    }),
  );
}

export async function getAdminContentIndex() {
  return withDatabaseRetry(() =>
    Promise.all([
      prisma.contentArticle.findMany({
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        take: 80,
        select: {
          id: true,
          slug: true,
          status: true,
          origin: true,
          sourceProductId: true,
          titleFa: true,
          titleEn: true,
          updatedAt: true,
          publishedAt: true,
          coverImageUrl: true,
          sourceProduct: {
            select: {
              nameFa: true,
              nameEn: true,
            },
          },
        },
      }),
      prisma.product.findMany({
        where: {
          status: {
            in: ["ACTIVE", "OUT_OF_STOCK"],
          },
        },
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            displayOrder: "asc",
          },
        ],
        take: 120,
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
              {
                isPrimary: "desc",
              },
              {
                displayOrder: "asc",
              },
            ],
            select: {
              imageUrl: true,
              isPrimary: true,
              displayOrder: true,
            },
          },
        },
      }),
      prisma.contentSeoSnapshot.findMany({
        orderBy: {
          recordedFor: "desc",
        },
        take: 14,
        select: {
          recordedFor: true,
          overallScore: true,
          publishedArticleCount: true,
          productsMissingDescription: true,
          productsMissingImageAlt: true,
        },
      }),
    ]),
  );
}
