type ArticleStructuredDataProps = {
  locale: "fa" | "en";
  slug: string;
  title: string;
  description: string;
  image: string | null;
  datePublished: Date | null;
  dateModified: Date;
};

function baseUrl(): URL | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configured) {
    return process.env.NODE_ENV === "production"
      ? null
      : new URL("http://localhost:3000");
  }

  try {
    const parsed = new URL(configured);

    return process.env.NODE_ENV === "production" && parsed.protocol !== "https:"
      ? null
      : parsed;
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

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function ArticleStructuredData({
  locale,
  slug,
  title,
  description,
  image,
  datePublished,
  dateModified,
}: ArticleStructuredDataProps) {
  const base = baseUrl();

  if (!base) {
    return null;
  }

  const path = `/${locale}/journal/${encodeURIComponent(slug)}`;
  const articleUrl = absoluteUrl(path, base);
  const imageUrl = image ? absoluteUrl(image, base) : null;

  if (!articleUrl) {
    return null;
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    author: {
      "@type": "Organization",
      name: "ELORIA",
    },
    publisher: {
      "@type": "Organization",
      name: "ELORIA",
    },
    inLanguage: locale === "fa" ? "fa-IR" : "en",
    ...(datePublished
      ? {
          datePublished: datePublished.toISOString(),
        }
      : {}),
    dateModified: dateModified.toISOString(),
    ...(imageUrl
      ? {
          image: imageUrl,
        }
      : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "fa" ? "الوریا" : "ELORIA",
        item: absoluteUrl(`/${locale}`, base),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: locale === "fa" ? "مجله" : "Journal",
        item: absoluteUrl(`/${locale}/journal`, base),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: articleUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson(articleSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson(breadcrumbSchema),
        }}
      />
    </>
  );
}
