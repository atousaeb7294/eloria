import type {
  Metadata,
} from "next";
import { hasCompleteLegalIdentity } from "@/lib/legal-business";
import type {
  ReactNode,
} from "react";
import {
  notFound,
} from "next/navigation";

const policies =
  new Set([
    "privacy",
    "terms",
    "shipping",
    "returns",
  ]);

function legalPagesMayIndex():
  boolean {
  return (
    process.env.NODE_ENV ===
      "production" &&
    process.env
      .ELORIA_LEGAL_PAGES_INDEX
      ?.trim()
      .toLowerCase() ===
      "true" &&
    hasCompleteLegalIdentity()
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    locale: string;
    policy: string;
  }>;
}): Promise<Metadata> {
  const {
    locale,
    policy,
  } = await params;

  if (
    (
      locale !== "fa" &&
      locale !== "en"
    ) ||
    !policies.has(policy)
  ) {
    notFound();
  }

  const mayIndex =
    legalPagesMayIndex();

  return {
    robots: {
      index: mayIndex,
      follow: true,
    },
    alternates: {
      canonical:
        `/${locale}/policies/${policy}`,
      languages: {
        fa:
          `/fa/policies/${policy}`,
        en:
          `/en/policies/${policy}`,
        "x-default":
          `/fa/policies/${policy}`,
      },
    },
  };
}

export default function PolicyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
