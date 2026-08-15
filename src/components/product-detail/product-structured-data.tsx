type Locale = "fa" | "en";

type ProductStructuredDataProps = {
  locale: Locale;
  slug: string;
  name: string;
  description: string;
  images: string[];
  sku: string | null;
  collectionSlug: string | null;
  collectionName: string;
  finalPriceToman: string;
  stock: number;
  purchasable: boolean;
};

function baseUrl(): URL | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configured) {
    if (process.env.NODE_ENV === "production") return null;
    return new URL("http://localhost:3000");
  }

  try {
    const parsed = new URL(configured);
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function absoluteUrl(value: string, base: URL): string | null {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function tomanToIrr(value: string): string | null {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) return null;
  return Math.round(normalized * 10).toString();
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function ProductStructuredData({
  locale,
  slug,
  name,
  description,
  images,
  sku,
  collectionSlug,
  collectionName,
  finalPriceToman,
  stock,
  purchasable,
}: ProductStructuredDataProps) {
  const base = baseUrl();
  const priceIrr = tomanToIrr(finalPriceToman);

  if (!base || !priceIrr) return null;

  const productPath = `/${locale}/products/${encodeURIComponent(slug)}`;
  const productUrl = absoluteUrl(productPath, base);

  if (!productUrl) return null;

  const absoluteImages = images
    .map(image => absoluteUrl(image, base))
    .filter((image): image is string => Boolean(image));

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url: productUrl,
    ...(absoluteImages.length ? { image: absoluteImages } : {}),
    ...(sku ? { sku } : {}),
    brand: {
      "@type": "Brand",
      name: "ELORIA",
    },
    category: collectionName,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "IRR",
      price: priceIrr,
      availability:
        purchasable && stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      inventoryLevel: {
        "@type": "QuantitativeValue",
        value: Math.max(0, stock),
      },
      seller: {
        "@type": "Organization",
        name: "ELORIA",
      },
    },
  };

  const breadcrumbItems: Array<Record<string, unknown>> = [
    {
      "@type": "ListItem",
      position: 1,
      name: locale === "fa" ? "الوریا" : "ELORIA",
      item: absoluteUrl(`/${locale}`, base),
    },
    {
      "@type": "ListItem",
      position: 2,
      name: locale === "fa" ? "گنجینه‌ها" : "Collections",
      item: absoluteUrl(`/${locale}/collections`, base),
    },
  ];

  if (collectionSlug) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: collectionName,
      item: absoluteUrl(
        `/${locale}/collections/${encodeURIComponent(collectionSlug)}`,
        base,
      ),
    });
  }

  breadcrumbItems.push({
    "@type": "ListItem",
    position: breadcrumbItems.length + 1,
    name,
    item: productUrl,
  });

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJson(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJson(breadcrumbSchema) }}
      />
    </>
  );
}
