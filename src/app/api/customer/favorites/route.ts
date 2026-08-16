import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCustomerFromRequest,
} from "@/lib/customer-auth";
import {
  addCustomerFavorites,
  removeCustomerFavorite,
} from "@/lib/customer-data";
import { prisma } from "@/lib/prisma";
import {
  readJsonBody,
} from "@/lib/security/json-body";
import {
  hasTrustedOrigin,
} from "@/lib/security/request";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
) {
  const auth =
    await getCustomerFromRequest(
      request,
    );

  if (!auth) {
    return NextResponse.json(
      { successful: false },
      { status: 401 },
    );
  }

  const favorites =
    await prisma.customerFavorite.findMany({
      where: {
        customerId:
          auth.customer.id,
        product: {
          status: {
            in: [
              "ACTIVE",
              "OUT_OF_STOCK",
            ],
          },
          collection: {
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: {
          select: {
            slug: true,
            nameFa: true,
            nameEn: true,
            status: true,
            images: {
              where: {
                isPrimary: true,
              },
              take: 1,
              select: {
                imageUrl: true,
              },
            },
          },
        },
      },
    });

  return NextResponse.json(
    {
      successful: true,
      favorites:
        favorites.map(item => ({
          slug:
            item.product.slug,
          nameFa:
            item.product.nameFa,
          nameEn:
            item.product.nameEn,
          status:
            item.product.status,
          imageUrl:
            item.product.images[0]
              ?.imageUrl ?? "",
          savedAt:
            item.createdAt.toISOString(),
        })),
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function POST(
  request: NextRequest,
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { successful: false },
      { status: 403 },
    );
  }

  const auth =
    await getCustomerFromRequest(
      request,
    );

  if (!auth) {
    return NextResponse.json(
      { successful: false },
      { status: 401 },
    );
  }

  const body =
    await readJsonBody<{
      slug?: unknown;
      slugs?: unknown;
    }>(
      request,
      8 * 1024,
    ).catch(() => null);

  const slugs =
    Array.isArray(body?.slugs)
      ? body.slugs.filter(
          (
            value,
          ): value is string =>
            typeof value ===
            "string",
        )
      : typeof body?.slug ===
          "string"
        ? [body.slug]
        : [];

  if (!slugs.length) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "محصول معتبر نیست.",
      },
      { status: 400 },
    );
  }

  await addCustomerFavorites(
    auth.customer.id,
    slugs,
  );

  return NextResponse.json({
    successful: true,
  });
}

export async function DELETE(
  request: NextRequest,
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { successful: false },
      { status: 403 },
    );
  }

  const auth =
    await getCustomerFromRequest(
      request,
    );

  if (!auth) {
    return NextResponse.json(
      { successful: false },
      { status: 401 },
    );
  }

  const body =
    await readJsonBody<{
      slug?: unknown;
    }>(
      request,
      8 * 1024,
    ).catch(() => null);

  if (
    typeof body?.slug !==
    "string"
  ) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "محصول معتبر نیست.",
      },
      { status: 400 },
    );
  }

  await removeCustomerFavorite(
    auth.customer.id,
    body.slug,
  );

  return NextResponse.json({
    successful: true,
  });
}
