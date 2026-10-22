import { prisma } from "@/lib/prisma";
import { UUID_PATTERN } from "@/lib/home-design-contract";

export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return new Response(null, { status: 404 });
  try {
    const image = await prisma.heroCutout.findFirst({
      where: {
        id,
        product: {
          status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
          collection: { isActive: true },
        },
      },
      select: { bytes: true },
    });
    if (!image) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(image.bytes.byteLength),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
