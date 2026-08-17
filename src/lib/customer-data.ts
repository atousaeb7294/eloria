import {
  Prisma,
} from "@/generated/prisma/client";
import {
  CheckoutCustomerError,
  normalizeCheckoutCustomer,
} from "@/lib/checkout-customer";
import {
  normalizeIranMobile,
} from "@/lib/customer-auth";
import {
  prisma,
} from "@/lib/prisma";

export class CustomerDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerDataError";
  }
}

export function normalizeCustomerName(
  value: unknown,
): string {
  if (
    typeof value !==
    "string"
  ) {
    throw new CustomerDataError(
      "نام و نام خانوادگی معتبر نیست.",
    );
  }

  const name =
    value
      .trim()
      .replace(
        /\s+/g,
        " ",
      );

  if (
    name.length < 2 ||
    name.length > 120
  ) {
    throw new CustomerDataError(
      "نام و نام خانوادگی معتبر نیست.",
    );
  }

  return name;
}

export function normalizeCustomerEmail(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !==
    "string"
  ) {
    throw new CustomerDataError(
      "ایمیل معتبر نیست.",
    );
  }

  const email =
    value
      .trim()
      .toLowerCase();

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    throw new CustomerDataError(
      "ایمیل معتبر نیست.",
    );
  }

  return email;
}

export async function updateCustomerProfile(
  customerId: string,
  input: {
    fullName: unknown;
    email: unknown;
  },
) {
  return prisma.customer.update({
    where: {
      id: customerId,
    },
    data: {
      fullName:
        normalizeCustomerName(
          input.fullName,
        ),
      email:
        normalizeCustomerEmail(
          input.email,
        ),
    },
    select: {
      id: true,
      mobile: true,
      fullName: true,
      email: true,
      mobileVerifiedAt:
        true,
      createdAt: true,
    },
  });
}

export function normalizeAddressInput(
  value: unknown,
) {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    throw new CustomerDataError(
      "اطلاعات آدرس معتبر نیست.",
    );
  }

  const input =
    value as Record<
      string,
      unknown
    >;

  const title =
    typeof input.title ===
    "string"
      ? input.title
          .trim()
          .slice(0, 80)
      : "";

  // ELORIA_CUSTOMER_ADDRESS_VALIDATION_WRAP_V1
  const customer = (() => {
    try {
      return normalizeCheckoutCustomer({
        fullName:
          String(
            input.recipientName ??
              "",
          ),
        mobile:
          String(
            input.mobile ?? "",
          ),
        email: null,
        province:
          String(
            input.province ?? "",
          ),
        city:
          String(
            input.city ?? "",
          ),
        postalCode:
          String(
            input.postalCode ??
              "",
          ),
        address:
          String(
            input.address ?? "",
          ),
      });
    } catch (error) {
      if (error instanceof CheckoutCustomerError) {
        throw new CustomerDataError(error.message);
      }

      throw error;
    }
  })();

  return {
    title:
      title || "آدرس من",
    recipientName:
      customer.fullName,
    mobile:
      customer.mobile,
    province:
      customer.province,
    city: customer.city,
    postalCode:
      customer.postalCode,
    address:
      customer.address,
    isDefault:
      input.isDefault ===
      true,
  };
}

async function lockCustomerAddressSet(
  tx: Prisma.TransactionClient,
  customerId: string,
) {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(
      hashtext(${`customer-address:${customerId}`})
    )
  `;
}

export async function createCustomerAddress(
  customerId: string,
  value: unknown,
) {
  const input =
    normalizeAddressInput(
      value,
    );

  return prisma.$transaction(
    async tx => {
      await lockCustomerAddressSet(
        tx,
        customerId,
      );

      const count =
        await tx.customerAddress.count({
          where: {
            customerId,
          },
        });

      const makeDefault =
        input.isDefault ||
        count === 0;

      if (makeDefault) {
        await tx.customerAddress.updateMany({
          where: {
            customerId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.customerAddress.create({
        data: {
          ...input,
          isDefault:
            makeDefault,
          customerId,
        },
      });
    },
  );
}

export async function updateCustomerAddress(
  customerId: string,
  addressId: string,
  value: unknown,
) {
  const input =
    normalizeAddressInput(
      value,
    );

  return prisma.$transaction(
    async tx => {
      await lockCustomerAddressSet(
        tx,
        customerId,
      );

      const existing =
        await tx.customerAddress.findFirst({
          where: {
            id: addressId,
            customerId,
          },
        });

      if (!existing) {
        throw new CustomerDataError(
          "آدرس پیدا نشد.",
        );
      }

      let makeDefault = input.isDefault;

      if (input.isDefault) {
        await tx.customerAddress.updateMany({
          where: {
            customerId,
            isDefault: true,
            NOT: {
              id: addressId,
            },
          },
          data: {
            isDefault: false,
          },
        });
      } else if (existing.isDefault) {
        const anotherDefault =
          await tx.customerAddress.findFirst({
            where: {
              customerId,
              id: { not: addressId },
              isDefault: true,
            },
            select: { id: true },
          });

        /* A customer with addresses should never accidentally end up with
         * no default merely because the default checkbox was unchecked. */
        makeDefault = !anotherDefault;
      }

      return tx.customerAddress.update({
        where: {
          id: addressId,
        },
        data: {
          ...input,
          isDefault: makeDefault,
        },
      });
    },
  );
}

export async function deleteCustomerAddress(
  customerId: string,
  addressId: string,
) {
  return prisma.$transaction(
    async tx => {
      await lockCustomerAddressSet(
        tx,
        customerId,
      );

      const existing =
        await tx.customerAddress.findFirst({
          where: {
            id: addressId,
            customerId,
          },
        });

      if (!existing) {
        throw new CustomerDataError(
          "آدرس پیدا نشد.",
        );
      }

      await tx.customerAddress.delete({
        where: {
          id: addressId,
        },
      });

      if (
        existing.isDefault
      ) {
        const next =
          await tx.customerAddress.findFirst({
            where: {
              customerId,
            },
            orderBy: {
              createdAt:
                "asc",
            },
          });

        if (next) {
          await tx.customerAddress.update({
            where: {
              id: next.id,
            },
            data: {
              isDefault:
                true,
            },
          });
        }
      }
    },
  );
}

const publicFavoriteProductWhere: Prisma.ProductWhereInput = {
  status: {
    in: [
      "ACTIVE",
      "OUT_OF_STOCK",
    ],
  },
  collection: {
    isActive: true,
  },
};

export async function getCustomerDashboard(
  customerId: string,
) {
  const [
    customer,
    orders,
    addresses,
    favorites,
    notifications,
  ] =
    await Promise.all([
      prisma.customer.findUniqueOrThrow({
        where: {
          id: customerId,
        },
        select: {
          id: true,
          mobile: true,
          fullName: true,
          email: true,
          mobileVerifiedAt:
            true,
          createdAt: true,
        },
      }),

      prisma.order.findMany({
        where: {
          customerId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          payableToman:
            true,
          createdAt: true,
          paidAt: true,
          province: true,
          city: true,
          postalCode: true,
          address: true,
          items: {
            take: 4,
            select: {
              id: true,
              productSlug:
                true,
              productNameFa:
                true,
              productNameEn:
                true,
              quantity: true,
              lineTotalToman:
                true,
            },
          },
        },
      }),

      prisma.customerAddress.findMany({
        where: {
          customerId,
        },
        orderBy: [
          {
            isDefault:
              "desc",
          },
          {
            createdAt:
              "desc",
          },
        ],
      }),

      prisma.customerFavorite.findMany({
        where: {
          customerId,
          product:
            publicFavoriteProductWhere,
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
                  isPrimary:
                    true,
                },
                take: 1,
                select: {
                  imageUrl:
                    true,
                },
              },
            },
          },
        },
      }),

      prisma.customerNotification.findMany({
        where: {
          customerId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
      }),
    ]);

  return {
    customer: {
      ...customer,
      mobileVerifiedAt:
        customer
          .mobileVerifiedAt
          ?.toISOString() ??
        null,
      createdAt:
        customer.createdAt
          .toISOString(),
    },

    orders:
      orders.map(order => ({
        ...order,
        payableToman:
          order
            .payableToman
            .toString(),
        createdAt:
          order.createdAt
            .toISOString(),
        paidAt:
          order.paidAt
            ?.toISOString() ??
          null,
        items:
          order.items.map(
            item => ({
              ...item,
              lineTotalToman:
                item
                  .lineTotalToman
                  .toString(),
            }),
          ),
      })),

    addresses:
      addresses.map(
        item => ({
          ...item,
          createdAt:
            item.createdAt
              .toISOString(),
          updatedAt:
            item.updatedAt
              .toISOString(),
        }),
      ),

    favorites:
      favorites.map(
        item => ({
          slug:
            item.product.slug,
          nameFa:
            item.product.nameFa,
          nameEn:
            item.product.nameEn,
          status:
            item.product.status,
          imageUrl:
            item.product
              .images[0]
              ?.imageUrl ?? "",
          savedAt:
            item.createdAt
              .toISOString(),
        }),
      ),

    notifications:
      notifications.map(
        item => ({
          ...item,
          createdAt:
            item.createdAt
              .toISOString(),
          readAt:
            item.readAt
              ?.toISOString() ??
            null,
        }),
      ),
  };
}

export async function customerCheckoutPrefill(
  customerId: string,
) {
  const [
    customer,
    address,
  ] =
    await Promise.all([
      prisma.customer.findUniqueOrThrow({
        where: {
          id: customerId,
        },
        select: {
          fullName:
            true,
          mobile: true,
          email: true,
        },
      }),

      prisma.customerAddress.findFirst({
        where: {
          customerId,
        },
        orderBy: [
          {
            isDefault:
              "desc",
          },
          {
            createdAt:
              "desc",
          },
        ],
      }),
    ]);

  return {
    fullName:
      customer.fullName ??
      address?.recipientName ??
      "",
    mobile:
      customer.mobile,
    email:
      customer.email ?? "",
    province:
      address?.province ?? "",
    city:
      address?.city ?? "",
    postalCode:
      address?.postalCode ??
      "",
    address:
      address?.address ?? "",
  };
}

export async function addCustomerFavorites(
  customerId: string,
  slugs: string[],
) {
  const clean =
    Array.from(
      new Set(
        slugs
          .map(slug =>
            slug.trim(),
          )
          .filter(Boolean),
      ),
    ).slice(0, 100);

  if (!clean.length) {
    return;
  }

  const products =
    await prisma.product.findMany({
      where: {
        slug: {
          in: clean,
        },
        ...publicFavoriteProductWhere,
      },
      select: {
        id: true,
      },
    });

  await prisma.$transaction(
    products.map(
      product =>
        prisma.customerFavorite.upsert({
          where: {
            customerId_productId: {
              customerId,
              productId:
                product.id,
            },
          },
          create: {
            customerId,
            productId:
              product.id,
          },
          update: {},
        }),
    ),
  );
}

export async function removeCustomerFavorite(
  customerId: string,
  slug: string,
) {
  const product =
    await prisma.product.findUnique({
      where: {
        slug:
          slug.trim(),
      },
      select: {
        id: true,
      },
    });

  if (!product) return;

  await prisma.customerFavorite.deleteMany({
    where: {
      customerId,
      productId:
        product.id,
    },
  });
}

export async function createCustomerNotification(
  input: {
    customerId: string;
    type: string;
    titleFa: string;
    titleEn: string;
    bodyFa: string;
    bodyEn: string;
    orderId?:
      string | null;
  },
) {
  return prisma.customerNotification.create({
    data: {
      ...input,
      orderId:
        input.orderId ??
        null,
    },
  });
}

export {
  normalizeIranMobile,
};
