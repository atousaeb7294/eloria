import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

const LOCALES = ["fa", "en"] as const;
const STATIC_ROUTES = ["", "/products", "/collections", "/about", "/contact"] as const;

function siteBase(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL برای sitemap تنظیم نشده است.");
  }

  return "http://localhost:3000";
}

function languageAlternates(base: string, route: string) {
  return {
    languages: {
      fa: `${base}/fa${route}`,
      en: `${base}/en${route}`,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBase();
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

  try {
    const [products, collections, materialPairs] = await Promise.all([
      prisma.product.findMany({
        where: {
          status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
          collection: { isActive: true },
        },
        select: { slug: true, updatedAt: true },
      }),
      prisma.collection.findMany({
        where: { isActive: true },
        select: { id: true, slug: true, updatedAt: true },
      }),
      prisma.product.findMany({
        where: {
          status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
          collection: { isActive: true },
        },
        select: {
          collectionId: true,
          material: true,
          collection: { select: { slug: true } },
        },
        distinct: ["collectionId", "material"],
      }),
    ]);

    for (const locale of LOCALES) {
      for (const collection of collections) {
        const route = `/collections/${collection.slug}`;
        entries.push({
          url: `${base}/${locale}${route}`,
          lastModified: collection.updatedAt,
          changeFrequency: "weekly",
          priority: 0.75,
          alternates: languageAlternates(base, route),
        });
      }

      for (const pair of materialPairs) {
        const material = pair.material === "GOLD" ? "gold" : "silver";
        const route = `/collections/${pair.collection.slug}/${material}`;
        entries.push({
          url: `${base}/${locale}${route}`,
          changeFrequency: "daily",
          priority: 0.72,
          alternates: languageAlternates(base, route),
        });
      }

      for (const product of products) {
        const route = `/products/${product.slug}`;
        entries.push({
          url: `${base}/${locale}${route}`,
          lastModified: product.updatedAt,
          changeFrequency: "daily",
          priority: 0.85,
          alternates: languageAlternates(base, route),
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
