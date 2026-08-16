import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import { consumeRateLimit } from "@/lib/security/rate-limit";
import { requestIp } from "@/lib/security/request";
import { readJsonBody } from "@/lib/security/json-body";

export const dynamic =
  "force-dynamic";

const DATABASE_TIMEOUT_MS =
  1800;

type RequestBody = {
  slugs?: unknown;
  locale?: unknown;
};

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer:
    | ReturnType<
        typeof setTimeout
      >
    | undefined;

  return Promise.race([
    promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),

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
                  "TREASURY_DATABASE_TIMEOUT",
                ),
              );
            },
            timeoutMs,
          );
      },
    ),
  ]);
}

function parseSlugs(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter(
          (
            item,
          ): item is string =>
            typeof item ===
            "string",
        )
        .map((item) =>
          item.trim(),
        )
        .filter(
          (item) =>
            item.length <= 160 &&
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item),
        ),
    ),
  ].slice(0, 50);
}

export async function POST(
  request: NextRequest,
) {
  const rate = await consumeRateLimit({
    key: `treasury-products:${requestIp(request)}`,
    limit: 60,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { items: [], source: "rate-limited" },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  const body =
    await readJsonBody<RequestBody>(request, 16 * 1024)
      .catch(() => null);

  const slugs =
    parseSlugs(
      body?.slugs,
    );

  const locale =
    body?.locale === "en"
      ? "en"
      : "fa";

  if (
    slugs.length === 0
  ) {
    return NextResponse.json(
      {
        items: [],
        source: "empty",
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  try {
    const products =
      await withTimeout(
        prisma.product.findMany(
          {
            where: {
              slug: {
                in: slugs,
              },
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

    const order =
      new Map(
        slugs.map(
          (
            slug,
            index,
          ) => [
            slug,
            index,
          ],
        ),
      );

    const items =
      products
        .map(
          (product) => ({
            slug:
              product.slug,

            name:
              locale === "fa"
                ? product.nameFa
                : product.nameEn,

            imageUrl:
              product
                .images[0]
                ?.imageUrl ??
              "",
          }),
        )
        .sort(
          (
            left,
            right,
          ) =>
            (order.get(
              left.slug,
            ) ?? 999) -
            (order.get(
              right.slug,
            ) ?? 999),
        );

    return NextResponse.json(
      {
        items,
        source:
          "database",
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  } catch (
    error
  ) {
    console.warn(
      "[Eloria Treasury] Product enrichment unavailable; local treasury remains active.",
      error,
    );

    return NextResponse.json(
      {
        items: [],
        source:
          "fallback",
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
