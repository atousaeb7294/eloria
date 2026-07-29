import type {
  Prisma,
} from "@/generated/prisma/client";

import {
  prisma,
} from "@/lib/prisma";

export type CatalogMaterial =
  | "GOLD"
  | "SILVER";

export type CatalogAvailability =
  | "ALL"
  | "AVAILABLE"
  | "OUT_OF_STOCK";

export type ProductCatalogFilters = {
  search?: string;

  collectionSlug?: string;

  material?: CatalogMaterial;

  availability?: CatalogAvailability;
};

export type CatalogProduct = {
  id: string;

  slug: string;

  sku: string | null;

  nameFa: string;

  nameEn: string;

  material: CatalogMaterial;

  collectionSlug: string;

  stock: number;

  isAvailable: boolean;

  image: {
    imageUrl: string;

    altFa: string | null;

    altEn: string | null;
  } | null;
};

export type ProductsCatalogResult = {
  products: CatalogProduct[];

  total: number;

  selectedCollection: {
    id: string;

    slug: string;
  } | null;
};

export type CollectionCatalog = {
  collection: {
    id: string;

    slug: string;
  };

  products: CatalogProduct[];
};

export class CatalogError extends Error {
  readonly code:
    | "INVALID_COLLECTION_SLUG"
    | "COLLECTION_NOT_FOUND";

  readonly status: number;

  constructor(
    code:
      | "INVALID_COLLECTION_SLUG"
      | "COLLECTION_NOT_FOUND",

    message: string,

    status = 400,
  ) {
    super(message);

    this.name =
      "CatalogError";

    this.code =
      code;

    this.status =
      status;
  }
}

function normalizeCollectionSlug(
  slug: string,
): string {
  const normalizedSlug =
    slug
      .trim()
      .toLowerCase();

  if (
    !normalizedSlug
  ) {
    throw new CatalogError(
      "INVALID_COLLECTION_SLUG",

      "شناسه گنجینه معتبر نیست.",

      400,
    );
  }

  return normalizedSlug;
}

function normalizeSearch(
  search?: string,
): string | undefined {
  const normalized =
    search
      ?.trim()
      .replace(
        /\s+/g,
        " ",
      )
      .slice(
        0,
        80,
      );

  return normalized ||
    undefined;
}

async function findCollection(
  collectionSlug: string,
) {
  const normalizedSlug =
    normalizeCollectionSlug(
      collectionSlug,
    );

  const collection =
    await prisma.collection.findUnique({
      where: {
        slug:
          normalizedSlug,
      },

      select: {
        id:
          true,

        slug:
          true,
      },
    });

  if (
    !collection
  ) {
    throw new CatalogError(
      "COLLECTION_NOT_FOUND",

      "گنجینه موردنظر پیدا نشد.",

      404,
    );
  }

  return collection;
}

export async function getProductsCatalog(
  filters: ProductCatalogFilters = {},
): Promise<ProductsCatalogResult> {
  const search =
    normalizeSearch(
      filters.search,
    );

  const availability =
    filters.availability ??
    "ALL";

  const selectedCollection =
    filters.collectionSlug
      ? await findCollection(
          filters.collectionSlug,
        )
      : null;

  const andFilters:
    Prisma.ProductWhereInput[] =
      [];

  if (
    search
  ) {
    andFilters.push({
      OR: [
        {
          nameFa: {
            contains:
              search,

            mode:
              "insensitive",
          },
        },

        {
          nameEn: {
            contains:
              search,

            mode:
              "insensitive",
          },
        },

        {
          slug: {
            contains:
              search,

            mode:
              "insensitive",
          },
        },

        {
          sku: {
            contains:
              search,

            mode:
              "insensitive",
          },
        },
      ],
    });
  }

  if (
    availability ===
    "AVAILABLE"
  ) {
    andFilters.push({
      status:
        "ACTIVE",

      stock: {
        gt:
          0,
      },
    });
  }

  if (
    availability ===
    "OUT_OF_STOCK"
  ) {
    andFilters.push({
      OR: [
        {
          status:
            "OUT_OF_STOCK",
        },

        {
          stock: {
            lte:
              0,
          },
        },
      ],
    });
  }

  const where:
    Prisma.ProductWhereInput =
      {
        status: {
          in: [
            "ACTIVE",
            "OUT_OF_STOCK",
          ],
        },

        ...(selectedCollection
          ? {
              collectionId:
                selectedCollection.id,
            }
          : {}),

        ...(filters.material
          ? {
              material:
                filters.material,
            }
          : {}),

        ...(andFilters.length >
        0
          ? {
              AND:
                andFilters,
            }
          : {}),
      };

  /*
   * محصول، گنجینه و تصویر اصلی در یک Query
   * از دیتابیس دریافت می‌شوند.
   */const products =
  await prisma.product.findMany({
    relationLoadStrategy:
      "join",

    where,
      orderBy: [
        {
          displayOrder:
            "asc",
        },

        {
          createdAt:
            "desc",
        },
      ],

      select: {
        id:
          true,

        slug:
          true,

        sku:
          true,

        nameFa:
          true,

        nameEn:
          true,

        material:
          true,

        stock:
          true,

        status:
          true,

        collection: {
          select: {
            id:
              true,

            slug:
              true,
          },
        },

        images: {
          orderBy: [
            {
              isPrimary:
                "desc",
            },

            {
              displayOrder:
                "asc",
            },
          ],

          take:
            1,

          select: {
            imageUrl:
              true,

            altFa:
              true,

            altEn:
              true,
          },
        },
      },
    });

  const catalogProducts =
    products.map(
      (
        product,
      ): CatalogProduct => {
        const primaryImage =
          product.images[0] ??
          null;

        return {
          id:
            product.id,

          slug:
            product.slug,

          sku:
            product.sku,

          nameFa:
            product.nameFa,

          nameEn:
            product.nameEn,

          material:
            product.material,

          collectionSlug:
            product.collection.slug,

          stock:
            product.stock,

          isAvailable:
            product.status ===
              "ACTIVE" &&
            product.stock >
              0,

          image:
            primaryImage
              ? {
                  imageUrl:
                    primaryImage.imageUrl,

                  altFa:
                    primaryImage.altFa,

                  altEn:
                    primaryImage.altEn,
                }
              : null,
        };
      },
    );

  return {
    products:
      catalogProducts,

    total:
      catalogProducts.length,

    selectedCollection,
  };
}

export async function getCollectionCatalog(
  collectionSlug: string,

  material?: CatalogMaterial,
): Promise<CollectionCatalog> {
  const result =
    await getProductsCatalog({
      collectionSlug,

      material,

      availability:
        "ALL",
    });

  if (
    !result.selectedCollection
  ) {
    throw new CatalogError(
      "COLLECTION_NOT_FOUND",

      "گنجینه موردنظر پیدا نشد.",

      404,
    );
  }

  return {
    collection:
      result.selectedCollection,

    products:
      result.products,
  };
}