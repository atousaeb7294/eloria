import type {
  MetadataRoute,
} from "next";

import {
  prisma,
} from "@/lib/prisma";
import {
  siteBaseUrl,
} from "@/lib/site-url";

export const revalidate = 3600;

const LOCALES = [
  "fa",
  "en",
] as const;

const STATIC_ROUTES = [
  "",
  "/products",
  "/collections",
  "/about",
  "/contact",
] as const;

function languageAlternates(
  base: string,
  route: string,
) {
  return {
    languages: {
      fa:
        `${base}/fa${route}`,
      en:
        `${base}/en${route}`,
      "x-default":
        `${base}/fa${route}`,
    },
  };
}

export default async function sitemap():
  Promise<MetadataRoute.Sitemap> {
  const base =
    siteBaseUrl()
      .toString()
      .replace(/\/$/, "");

  const entries:
    MetadataRoute.Sitemap =
      [];

  for (
    const locale of
    LOCALES
  ) {
    for (
      const route of
      STATIC_ROUTES
    ) {
      entries.push({
        url:
          `${base}/${locale}${route}`,
        changeFrequency:
          route === ""
            ? "daily"
            : "weekly",
        priority:
          route === ""
            ? 1
            : route ===
                "/products"
              ? 0.9
              : 0.7,
        alternates:
          languageAlternates(
            base,
            route,
          ),
      });
    }
  }

  try {
    const [
      products,
      collections,
      materialPairs,
    ] =
      await Promise.all([
        prisma.product.findMany({
          where: {
            status: {
              in: [
                "ACTIVE",
                "OUT_OF_STOCK",
              ],
            },
            collection: {
              isActive:
                true,
            },
          },
          select: {
            slug: true,
            updatedAt:
              true,
          },
        }),

        prisma.collection.findMany({
          where: {
            isActive: true,
          },
          select: {
            id: true,
            slug: true,
            updatedAt:
              true,
          },
        }),

        prisma.product.findMany({
          where: {
            status: {
              in: [
                "ACTIVE",
                "OUT_OF_STOCK",
              ],
            },
            collection: {
              isActive:
                true,
            },
          },
          select: {
            collectionId:
              true,
            material:
              true,
            collection: {
              select: {
                slug:
                  true,
              },
            },
          },
          distinct: [
            "collectionId",
            "material",
          ],
        }),
      ]);

    for (
      const locale of
      LOCALES
    ) {
      for (
        const collection of
        collections
      ) {
        const route =
          `/collections/${collection.slug}`;

        entries.push({
          url:
            `${base}/${locale}${route}`,
          lastModified:
            collection.updatedAt,
          changeFrequency:
            "weekly",
          priority: 0.75,
          alternates:
            languageAlternates(
              base,
              route,
            ),
        });
      }

      for (
        const pair of
        materialPairs
      ) {
        const material =
          pair.material ===
          "GOLD"
            ? "gold"
            : "silver";

        const route =
          `/collections/${pair.collection.slug}/${material}`;

        entries.push({
          url:
            `${base}/${locale}${route}`,
          changeFrequency:
            "daily",
          priority: 0.72,
          alternates:
            languageAlternates(
              base,
              route,
            ),
        });
      }

      for (
        const product of
        products
      ) {
        const route =
          `/products/${product.slug}`;

        entries.push({
          url:
            `${base}/${locale}${route}`,
          lastModified:
            product.updatedAt,
          changeFrequency:
            "daily",
          priority: 0.85,
          alternates:
            languageAlternates(
              base,
              route,
            ),
        });
      }
    }
  } catch (error) {
    console.error(
      "[Eloria Sitemap] Dynamic entries unavailable; serving static sitemap.",
      error,
    );
  }

  return entries;
}
