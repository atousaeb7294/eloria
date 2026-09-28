import assert from "node:assert/strict";
import type { Prisma } from "../src/generated/prisma/client";

export async function testProductMediaMutations() {
  const { prisma } = await import("../src/lib/prisma");
  const { withProductMediaLock, deleteProductGalleryImage } =
    await import("../src/lib/product-media-mutations");
  const originalTransaction = prisma.$transaction;
  let state = {
    images: [
      {
        id: "first",
        productId: "p1",
        imageUrl: "/first.webp",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "next",
        productId: "p1",
        imageUrl: "/next.webp",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    products: [
      {
        id: "p1",
        characterImageUrl: "/first.webp" as string | null,
        worldSceneImageUrl: "/first.webp" as string | null,
      },
    ],
  };
  let tail = Promise.resolve();
  let failStoryUpdate = false;
  let mutations = 0;
  prisma.$transaction = (async (
    operation: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ) => {
    let release: (() => void) | undefined;
    let snapshot: typeof state | undefined;
    let locked = false;
    const checkLock = () =>
      assert.ok(locked, "Reads and writes must follow the product lock");
    const tx = {
      $executeRaw: async (_strings: TemplateStringsArray, key: string) => {
        assert.equal(key, "product-media:p1");
        const previous = tail;
        tail = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        locked = true;
        snapshot = structuredClone(state);
        return 1;
      },
      productImage: {
        findFirst: async ({
          where,
          orderBy,
        }: {
          where: Partial<(typeof state.images)[number]>;
          orderBy?: unknown;
        }) => {
          checkLock();
          const candidates = state.images.filter((image) =>
            Object.entries(where).every(
              ([key, value]) => image[key as keyof typeof image] === value,
            ),
          );
          if (orderBy)
            candidates.sort((a, b) => a.displayOrder - b.displayOrder);
          return candidates[0] ?? null;
        },
        delete: async ({ where }: { where: { id: string } }) => {
          checkLock();
          mutations++;
          state.images = state.images.filter((image) => image.id !== where.id);
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { isPrimary: boolean };
        }) => {
          checkLock();
          mutations++;
          Object.assign(
            state.images.find((image) => image.id === where.id)!,
            data,
          );
        },
      },
      product: {
        updateMany: async ({
          where,
          data,
        }: {
          where: Partial<(typeof state.products)[number]>;
          data: Partial<(typeof state.products)[number]>;
        }) => {
          checkLock();
          mutations++;
          if (failStoryUpdate && "worldSceneImageUrl" in data)
            throw new Error("database write failed");
          for (const product of state.products) {
            if (
              Object.entries(where).every(
                ([key, value]) =>
                  product[key as keyof typeof product] === value,
              )
            )
              Object.assign(product, data);
          }
        },
        findFirst: async ({
          where,
        }: {
          where: { OR: Partial<(typeof state.products)[number]>[] };
        }) => {
          checkLock();
          return (
            state.products.find((product) =>
              where.OR.some((condition) =>
                Object.entries(condition).every(
                  ([key, value]) =>
                    product[key as keyof typeof product] === value,
                ),
              ),
            ) ?? null
          );
        },
      },
    };
    try {
      return await operation(tx as unknown as Prisma.TransactionClient);
    } catch (error) {
      if (snapshot) state = snapshot;
      throw error;
    } finally {
      release?.();
    }
  }) as typeof prisma.$transaction;
  try {
    let concurrentValue = 0;
    await Promise.all(
      [0, 1].map(() =>
        withProductMediaLock("p1", async () => {
          const previous = concurrentValue;
          await Promise.resolve();
          concurrentValue = previous + 1;
        }),
      ),
    );
    assert.equal(
      concurrentValue,
      2,
      "Concurrent gallery work must serialize its reads and writes",
    );
    assert.equal(
      await deleteProductGalleryImage("p1", "wrong-product-image"),
      null,
    );
    assert.equal(
      mutations,
      0,
      "An image outside this product must not cause writes",
    );
    const beforeFailure = structuredClone(state);
    failStoryUpdate = true;
    await assert.rejects(
      () => deleteProductGalleryImage("p1", "first"),
      /database write failed/,
    );
    assert.deepEqual(
      state,
      beforeFailure,
      "Gallery removal and story cleanup must roll back together",
    );
    failStoryUpdate = false;
    const result = await deleteProductGalleryImage("p1", "first");
    assert.deepEqual(result, { imageUrl: "/first.webp", removeAsset: true });
    assert.equal(state.products[0].characterImageUrl, null);
    assert.equal(state.products[0].worldSceneImageUrl, null);
    assert.equal(state.images[0].id, "next");
    assert.equal(
      state.images[0].isPrimary,
      true,
      "Deleting the primary must promote a remaining image",
    );

    state.images.push({
      id: "shared",
      productId: "other",
      imageUrl: "/next.webp",
      isPrimary: true,
      displayOrder: 0,
    });
    state.products[0].characterImageUrl = "/unrelated.webp";
    const shared = await deleteProductGalleryImage("p1", "next");
    assert.equal(
      shared?.removeAsset,
      false,
      "A remaining gallery reference must preserve the bytes",
    );
    assert.equal(
      state.products[0].characterImageUrl,
      "/unrelated.webp",
      "Unrelated artwork must survive deletion",
    );
  } finally {
    prisma.$transaction = originalTransaction;
  }
}
