import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { acquireCronLease, releaseCronLease } from "@/lib/cron-lease";
import { prepareHeroCutout } from "@/lib/hero-cutout";
import { HERO_PIPELINE_VERSION } from "@/lib/home-design-contract";

let working = false;

/** Only public, database-selected sources enter the existing private worker. */
export async function automaticCutoutStatus(ids: string[]) {
  const images = await prisma.productImage.findMany({
    where: {
      id: { in: ids },
      product: {
        status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
        collection: { isActive: true },
      },
    },
    select: { id: true, productId: true, imageUrl: true },
  });
  const assets = await prisma.heroCutout.findMany({
    where: {
      sourceImageId: { in: images.map((image) => image.id) },
      pipelineVersion: HERO_PIPELINE_VERSION,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sourceImageId: true,
      sourceImageUrl: true,
      productId: true,
    },
  });
  const ready: Record<string, string> = {};
  for (const image of images) {
    const asset = assets.find(
      (item) =>
        item.sourceImageId === image.id &&
        item.productId === image.productId &&
        item.sourceImageUrl === image.imageUrl,
    );
    if (asset) ready[image.id] = `/api/media/hero/${asset.id}`;
  }
  const enabled = Boolean(
    process.env.ELORIA_CUTOUT_URL &&
    (process.env.ELORIA_CUTOUT_TOKEN?.length ?? 0) >= 32,
  );
  const missing = images.filter((image) => !ready[image.id]);
  if (enabled && missing.length && !working) {
    working = true;
    after(async () => {
      try {
        for (const id of ids) {
          const image = missing.find((item) => item.id === id);
          if (!image) continue;
          const key = `automatic-cutout:${image.id}`;
          const lease = await acquireCronLease({ key, leaseMs: 300_000 });
          if (!lease.acquired) continue;
          try {
            await prepareHeroCutout(image.productId, image.id);
            await releaseCronLease(key, lease.holder);
          } catch {
            console.warn(
              "[Eloria Media] Automatic cutout deferred; original source preserved.",
            );
          }
          break;
        }
      } finally {
        working = false;
      }
    });
  }
  return { ready, pending: enabled ? missing.map((image) => image.id) : [] };
}
