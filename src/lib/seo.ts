import type { Metadata } from "next";

export type EloriaLocale = "fa" | "en";

function normalizePath(path: string): string {
  if (!path || path === "/") return "";
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.replace(/\/+$/, "");
}

export function truncateMetaDescription(
  value: string,
  fallback: string,
  maxLength = 158,
): string {
  const normalized =
    value.trim().replace(/\s+/g, " ") ||
    fallback.trim().replace(/\s+/g, " ");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const clipped = normalized.slice(0, maxLength + 1);
  const boundary = clipped.lastIndexOf(" ");
  const safe =
    boundary >= Math.floor(maxLength * 0.7)
      ? clipped.slice(0, boundary)
      : normalized.slice(0, maxLength);

  return `${safe.trim().replace(/[،,;:.\-–—]+$/u, "")}…`;
}

export function localizedPageMetadata(input: {
  locale: EloriaLocale;
  path: string;
  title: string;
  description: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const normalizedPath = normalizePath(input.path);
  const canonical = `/${input.locale}${normalizedPath}`;

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical,
      languages: {
        fa: `/fa${normalizedPath}`,
        en: `/en${normalizedPath}`,
        "x-default": `/fa${normalizedPath}`,
      },
    },
    openGraph: {
      type: "website",
      siteName: "ELORIA",
      locale: input.locale === "fa" ? "fa_IR" : "en_US",
      alternateLocale: input.locale === "fa" ? ["en_US"] : ["fa_IR"],
      title: input.title,
      description: input.description,
      url: canonical,
      ...(input.image
        ? {
            images: [{ url: input.image, alt: input.title }],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      ...(input.image ? { images: [input.image] } : {}),
    },
    ...(input.noIndex
      ? {
          robots: {
            index: false,
            follow: false,
            noarchive: true,
          },
        }
      : {}),
  };
}
