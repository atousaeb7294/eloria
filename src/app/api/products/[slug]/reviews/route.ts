import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/json-body";
import { buyerReviewSchema, purchaseStates } from "@/lib/buyer-commerce-policy";
export const dynamic = "force-dynamic";
const reply = (message: string, status: number) =>
  NextResponse.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!hasTrustedOrigin(request)) return reply("مبدأ نامعتبر است.", 403);
  try {
    const auth = await getCustomerFromRequest(request);
    if (!auth) return reply("برای ثبت نظر وارد حساب خریدار شوید.", 401);
    const rate = await consumeRateLimit({
      key: `review:${auth.customer.id}:${requestIp(request)}`,
      limit: 5,
      windowMs: 600000,
    });
    if (!rate.allowed) return reply("کمی بعد تلاش کنید.", 429);
    const parsed = buyerReviewSchema.safeParse(
      await readJsonBody(request, 12000),
    );
    if (!parsed.success)
      return reply("امتیاز، نام نمایشی یا متن نظر معتبر نیست.", 400);
    const { slug } = await params;
    const product = await prisma.product.findFirst({
      where: {
        slug,
        status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
        collection: { isActive: true },
      },
      select: { id: true },
    });
    if (!product) return reply("محصول یافت نشد.", 404);
    const purchase = await prisma.order.findFirst({
      where: {
        customerId: auth.customer.id,
        paidAt: { not: null },
        status: { in: [...purchaseStates] },
        items: { some: { productId: product.id } },
      },
      select: { id: true },
    });
    if (!purchase)
      return reply(
        "ثبت نظر مخصوص خریداران این محصول با سفارش پرداخت‌شده است.",
        403,
      );
    await prisma.buyerReview.create({
      data: {
        ...parsed.data,
        productId: product.id,
        customerId: auth.customer.id,
        orderId: purchase.id,
      },
    });
    return reply("نظر شما ثبت شد و پس از بررسی مدیر نمایش داده می‌شود.", 201);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    )
      return reply("شما قبلاً برای این محصول نظر ثبت کرده‌اید.", 409);
    return reply("ثبت نظر فعلاً ممکن نیست؛ دوباره تلاش کنید.", 503);
  }
}
