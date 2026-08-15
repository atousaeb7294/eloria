import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, clearCustomerSessionCookie, revokeCustomerSession } from "@/lib/customer-auth";
import { hasTrustedOrigin } from "@/lib/security/request";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ successful: false }, { status: 403 });
  await revokeCustomerSession(request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const response = NextResponse.json({ successful: true });
  clearCustomerSessionCookie(response);
  return response;
}
