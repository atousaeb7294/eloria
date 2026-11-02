import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { siteBaseUrl } from "@/lib/site-url";

// Build environments may have no database. Generate against the runtime
// database so an empty build-time fallback cannot remain the public sitemap.
export const dynamic = "force-dynamic";

const LOCALES = ["fa", "en"] as const;

const STATIC_ROUTES = [
  "",
  "/products",
  "/collections",
  "/collections/weave",
  "/collections/gold",
  "/collections/silver",
  "/journal",
  "/journal/wrist-size-guide",
  "/about",
  "/story",
  "/atelier",
  "/contact",
] as const;

function languageAlternates(base: string, route: string) {
  return {
    languages: {
      fa: `${base}/fa${route}`,
      en: `${base}/en${route}`,
      "x-default": `${base}/fa${route}`,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl().toString().replace(/\/$/, "");

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const route of STATIC_ROUTES) {
      entries.push({
        url: `${base}/${locale}${route}`,
        changeFrequency: route === "" ? "daily" : "weekly",
        priority: route === "" ? 1 : route === "/products" ? 0.9 : 0.7,
        alternates: languageAlternates(base, route),
      });
    }
  }

  // A temporary journal failure must not remove valid product URLs, and vice versa.
  const [productResult, articleResult] = await Promise.allSettled([
      prisma.product.findMany({
        where: {
          status: {
            in: ["ACTIVE", "OUT_OF_STOCK"],
          },
          collection: {
            isActive: true,
          },
        },
        select: {
          slug: true,
          updatedAt: true,
        },
      }),

      prisma.contentArticle.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: {
            not: null,
          },
        },
        select: {
          slug: true,
          updatedAt: true,
        },
      }),
  ]);
  const products = productResult.status === "fulfilled" ? productResult.value : [];
  const articles = articleResult.status === "fulfilled" ? articleResult.value : [];
  if (productResult.status === "rejected") console.warn("[Eloria Sitemap] Product URLs temporarily unavailable.");
  if (articleResult.status === "rejected") console.warn("[Eloria Sitemap] Journal URLs temporarily unavailable.");

    for (const locale of LOCALES) {
      for (const product of products) {
        const route = `/products/${encodeURIComponent(product.slug)}`;

        entries.push({
          url: `${base}/${locale}${route}`,
          lastModified: product.updatedAt,
          changeFrequency: "daily",
          priority: 0.85,
          alternates: languageAlternates(base, route),
        });
      }

      for (const article of articles) {
        const route = `/journal/${encodeURIComponent(article.slug)}`;

        entries.push({
          url: `${base}/${locale}${route}`,
          lastModified: article.updatedAt,
          changeFrequency: "monthly",
          priority: 0.68,
          alternates: languageAlternates(base, route),
        });
      }
    }

  return Array.from(new Map(entries.map(entry => [entry.url, entry])).values());
}
