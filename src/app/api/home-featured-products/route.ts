import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const DATABASE_TIMEOUT_MS =
  1600;

const FAILURE_COOLDOWN_MS =
  60_000;

let retryAfterTimestamp =
  0;

const configuredSlugs =
  (process.env.HOME_FEATURED_PRODUCT_SLUGS ?? "")
    .split(",")
    .map(
      (slug) =>
        slug.trim(),
    )
    .filter(Boolean)
    .slice(0, 7);

function jsonResponse(
  items: Array<{
    slug: string;
    name: string;
    imageUrl: string;
    href: string;
  }>,
  source:
    | "database"
    | "cooldown"
    | "fallback",
) {
  const cacheControl =
    source === "database"
      ? "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
      : "public, max-age=10, s-maxage=20";

  return NextResponse.json(
    {
      items,
    },
    {
      status: 200,
      headers: {
        "Cache-Control":
          cacheControl,
        "X-Eloria-Featured-Source":
          source,
      },
    },
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer:
    | ReturnType<
        typeof setTimeout
      >
    | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>(
        (
          _resolve,
          reject,
        ) => {
          timer =
            setTimeout(
              () => {
                reject(
                  new Error(
                    "HOME_FEATURED_DATABASE_TIMEOUT",
                  ),
                );
              },
              timeoutMs,
            );
        },
      ),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function GET(
  request: Request,
) {
  const url =
    new URL(request.url);

  const locale =
    url.searchParams.get(
      "locale",
    ) === "en"
      ? "en"
      : "fa";

  if (
    Date.now() <
    retryAfterTimestamp
  ) {
    return jsonResponse(
      [],
      "cooldown",
    );
  }

  try {
    const products =
      await withTimeout(
        prisma.product.findMany(
          {
            take: 7,

            where:
              configuredSlugs.length
                ? {
                    slug: {
                      in:
                        configuredSlugs,
                    },
                  }
                : undefined,

            orderBy: {
              createdAt:
                "desc",
            },

            select: {
              slug: true,
              nameFa: true,
              nameEn: true,

              images: {
                take: 1,

                orderBy: [
                  {
                    isPrimary:
                      "desc",
                  },
                  {
                    displayOrder:
                      "asc",
                  },
                  {
                    createdAt:
                      "asc",
                  },
                ],

                select: {
                  imageUrl:
                    true,
                },
              },
            },
          },
        ),
        DATABASE_TIMEOUT_MS,
      );

    retryAfterTimestamp =
      0;

    const orderedProducts =
      configuredSlugs.length
        ? [...products].sort(
            (
              left,
              right,
            ) =>
              configuredSlugs.indexOf(
                left.slug,
              ) -
              configuredSlugs.indexOf(
                right.slug,
              ),
          )
        : products;

    const items =
      orderedProducts
        .filter(
          (product) =>
            Boolean(
              product
                .images[0]
                ?.imageUrl,
            ),
        )
        .map(
          (product) => ({
            slug:
              product.slug,

            name:
              locale === "fa"
                ? product.nameFa
                : product.nameEn,

            imageUrl:
              product.images[0]
                ?.imageUrl ??
              "",

            href: `/${locale}/products/${product.slug}`,
          }),
        );

    return jsonResponse(
      items,
      "database",
    );
  } catch (
    error
  ) {
    retryAfterTimestamp =
      Date.now() +
      FAILURE_COOLDOWN_MS;

    console.warn(
      "[Eloria Home] Featured products unavailable; local fallback remains active.",
      error,
    );

    return jsonResponse(
      [],
      "fallback",
    );
  }
}
