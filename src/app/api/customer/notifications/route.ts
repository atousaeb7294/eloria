import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { hasTrustedOrigin } from "@/lib/security/request";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const auth = await getCustomerFromRequest(request);
  if (!auth) return NextResponse.json({ successful: false }, { status: 401 });
  const notifications = await prisma.customerNotification.findMany({ where: { customerId: auth.customer.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ successful: true, notifications }, { headers: { "Cache-Control": "no-store" } });
}
export async function PATCH(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ successful: false }, { status: 403 });
  const auth = await getCustomerFromRequest(request);
  if (!auth) return NextResponse.json({ successful: false }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown; all?: unknown } | null;
  const now = new Date();
  if (body?.all === true) {
    await prisma.customerNotification.updateMany({ where: { customerId: auth.customer.id, readAt: null }, data: { readAt: now } });
    return NextResponse.json({ successful: true });
  }
  if (typeof body?.id !== "string") return NextResponse.json({ successful: false, message: "شناسه اعلان معتبر نیست." }, { status: 400 });
  await prisma.customerNotification.updateMany({ where: { id: body.id, customerId: auth.customer.id }, data: { readAt: now } });
  return NextResponse.json({ successful: true });
}
