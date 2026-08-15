import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { createCustomerAddress } from "@/lib/customer-data";
import { prisma } from "@/lib/prisma";
import { hasTrustedOrigin } from "@/lib/security/request";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const auth = await getCustomerFromRequest(request);
  if (!auth) return NextResponse.json({ successful: false }, { status: 401 });
  const addresses = await prisma.customerAddress.findMany({ where: { customerId: auth.customer.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return NextResponse.json({ successful: true, addresses }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ successful: false, message: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const auth = await getCustomerFromRequest(request);
  if (!auth) return NextResponse.json({ successful: false, message: "ابتدا وارد حساب شوید." }, { status: 401 });
  const body = await request.json().catch(() => null);
  try { return NextResponse.json({ successful: true, address: await createCustomerAddress(auth.customer.id, body) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ successful: false, message: error instanceof Error ? error.message : "ذخیره آدرس ناموفق بود." }, { status: 400 }); }
}
