import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { JsonRequestBodyError, readJsonBody } from "@/lib/security/json-body";
import { hasTrustedOrigin } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET(request: NextRequest) {
  const auth = await getCustomerFromRequest(request);
  if (!auth)
    return NextResponse.json(
      { successful: false },
      { status: 401, headers: noStoreHeaders },
    );
  const notifications = await prisma.customerNotification.findMany({
    where: { customerId: auth.customer.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(
    { successful: true, notifications },
    { headers: noStoreHeaders },
  );
}
export async function PATCH(request: NextRequest) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json(
      { successful: false },
      { status: 403, headers: noStoreHeaders },
    );
  const auth = await getCustomerFromRequest(request);
  if (!auth)
    return NextResponse.json(
      { successful: false },
      { status: 401, headers: noStoreHeaders },
    );

  let body: { id?: unknown; all?: unknown };
  try {
    body = await readJsonBody(request, 4 * 1024);
  } catch (error) {
    const bodyError = error instanceof JsonRequestBodyError ? error : null;
    return NextResponse.json(
      {
        successful: false,
        message: bodyError?.message ?? "بدنه درخواست معتبر نیست.",
      },
      {
        status: bodyError?.status ?? 400,
        headers: noStoreHeaders,
      },
    );
  }

  const now = new Date();
  if (body.all === true) {
    await prisma.customerNotification.updateMany({
      where: { customerId: auth.customer.id, readAt: null },
      data: { readAt: now },
    });
    return NextResponse.json({ successful: true }, { headers: noStoreHeaders });
  }
  if (typeof body.id !== "string")
    return NextResponse.json(
      { successful: false, message: "شناسه اعلان معتبر نیست." },
      { status: 400, headers: noStoreHeaders },
    );
  await prisma.customerNotification.updateMany({
    where: { id: body.id, customerId: auth.customer.id },
    data: { readAt: now },
  });
  return NextResponse.json({ successful: true }, { headers: noStoreHeaders });
}
