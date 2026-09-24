import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    return new Response(null, { status: 404 });
  }
  try {
    const asset = await prisma.productMediaAsset.findUnique({
      where: { id },
      select: { bytes: true, contentType: true },
    });
    if (!asset) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(asset.bytes), {
      headers: {
        "Content-Type": asset.contentType,
        "Content-Length": String(asset.bytes.byteLength),
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error("[Eloria Media] Stored image unavailable.", error);
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
