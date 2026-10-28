import { prisma } from "@/lib/prisma";
import { serveHeroImage } from "@/lib/hero-image-response";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return serveHeroImage(request, id, async () => {
    const asset = await prisma.heroCutout.findFirst({
      where: {
        id,
        product: {
          status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
          collection: { isActive: true },
        },
      },
      select: { bytes: true },
    });
    return asset ? new Uint8Array(asset.bytes) : null;
  });
}
