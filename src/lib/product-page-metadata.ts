import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function buildProductPageMetadata(locale: string, slug: string): Promise<Metadata> {
  if (locale !== "fa" && locale !== "en") return {};
    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        nameFa: true,
        nameEn: true,
        descriptionFa: true,
        descriptionEn: true,
        status: true,
        updatedAt: true,
        images: { orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }], take: 1, select: { imageUrl: true, altFa: true, altEn: true } },
      },
    });
    if (!product) return { robots: { index: false, follow: false } };
    const isPersian = locale === "fa";
    const title = isPersian ? product.nameFa : product.nameEn;
    const description = (isPersian ? product.descriptionFa : product.descriptionEn)?.slice(0, 160) || title;
    const image = product.images[0];
    const path = `/${locale}/products/${slug}`;
    return {
      title,
      description,
      alternates: {
        canonical: path,
        languages: { fa: `/fa/products/${slug}`, en: `/en/products/${slug}`, "x-default": `/fa/products/${slug}` },
      },
      robots: { index: product.status !== "ARCHIVED" && product.status !== "DRAFT", follow: true },
      openGraph: {
        type: "website",
        title,
        description,
        url: path,
        images: image ? [{ url: image.imageUrl, alt: (isPersian ? image.altFa : image.altEn) || title }] : undefined,
      },
      twitter: { card: "summary_large_image", title, description, images: image ? [image.imageUrl] : undefined },
    };
}
