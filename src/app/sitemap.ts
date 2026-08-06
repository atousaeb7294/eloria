import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

const LOCALES = ["fa", "en"] as const;
const STATIC_ROUTES = ["", "/products", "/collections", "/about", "/contact"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://eloria.example";
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const route of STATIC_ROUTES) {
      entries.push({
        url: `${base}/${locale}${route}`,
        lastModified: now,
        changeFrequency: route === "" ? "daily" : "weekly",
        priority: route === "" ? 1 : route === "/products" ? 0.9 : 0.7,
        alternates: {
          languages: {
            fa: `${base}/fa${route}`,
            en: `${base}/en${route}`,
          },
        },
      });
    }
  }

  try {
    const [products, collections] = await Promise.all([
      prisma.product.findMany({
        where: { status: { in: ["ACTIVE", "OUT_OF_STOCK"] } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.collection.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    for (const locale of LOCALES) {
      for (const collection of collections) {
        entries.push({
          url: `${base}/${locale}/collections/${collection.slug}`,
          lastModified: collection.updatedAt,
          changeFrequency: "weekly",
          priority: 0.75,
          alternates: {
            languages: {
              fa: `${base}/fa/collections/${collection.slug}`,
              en: `${base}/en/collections/${collection.slug}`,
            },
          },
        });
      }

      for (const product of products) {
        entries.push({
          url: `${base}/${locale}/products/${product.slug}`,
          lastModified: product.updatedAt,
          changeFrequency: "daily",
          priority: 0.85,
          alternates: {
            languages: {
              fa: `${base}/fa/products/${product.slug}`,
              en: `${base}/en/products/${product.slug}`,
            },
          },
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
