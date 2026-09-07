import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await getCustomerFromRequest(request);
  if (!auth) return NextResponse.json({ successful: false }, { status: 401 });
  const orders = await prisma.order.findMany({
    where: { customerId: auth.customer.id }, orderBy: { createdAt: "desc" }, take: 50,
    select: {
      id: true, orderNumber: true, status: true, payableToman: true, createdAt: true, paidAt: true,
      province: true, city: true, postalCode: true, address: true,
      items: { select: { id: true, productSlug: true, productNameFa: true, productNameEn: true, quantity: true, lineTotalToman: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, gatewayReference: true, verifiedAt: true } },
    },
  });
  return NextResponse.json({ successful: true, orders: orders.map(order => ({
    ...order,
    payableToman: order.payableToman.toString(),
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    items: order.items.map(item => ({ ...item, lineTotalToman: item.lineTotalToman.toString() })),
  })) }, { headers: { "Cache-Control": "no-store" } });
}
