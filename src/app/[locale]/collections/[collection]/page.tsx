import {
  notFound,
  redirect,
} from "next/navigation";

import {
  setRequestLocale,
} from "next-intl/server";

type CollectionRedirectPageProps = {
  params: Promise<{
    locale: string;
    collection: string;
  }>;
};

const allowedCollections = [
  "necklaces",
  "bracelets",
  "earrings",
];

export default async function CollectionRedirectPage({
  params,
}: CollectionRedirectPageProps) {
  const {
    locale,
    collection,
  } = await params;

  setRequestLocale(locale);

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  if (
    !allowedCollections.includes(
      collection,
    )
  ) {
    notFound();
  }

  redirect(
    `/${locale}/collections#${collection}`,
  );
}