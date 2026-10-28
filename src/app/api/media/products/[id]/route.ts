import { serveProductImage } from "@/lib/product-image-response";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: Request,
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
  return serveProductImage(request,id,()=>prisma.productMediaAsset.findUnique({
    where:{id},select:{bytes:true,contentType:true},
  }));
}
