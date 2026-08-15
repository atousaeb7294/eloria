import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { customerCheckoutPrefill, updateCustomerProfile } from "@/lib/customer-data";
import { hasTrustedOrigin } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getCustomerFromRequest(request);
  if (!auth) return NextResponse.json({ successful: false }, { status: 401 });
  const checkout = await customerCheckoutPrefill(auth.customer.id);
  return NextResponse.json({ successful: true, customer: { id: auth.customer.id, mobile: auth.customer.mobile, fullName: auth.customer.fullName, email: auth.customer.email }, checkout }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ successful: false, message: "Ù…Ø¨Ø¯Ø£ Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª." }, { status: 403 });
  const auth = await getCustomerFromRequest(request);
  if (!auth) return NextResponse.json({ successful: false, message: "Ø§Ø¨ØªØ¯Ø§ ÙˆØ§Ø±Ø¯ Ø­Ø³Ø§Ø¨ Ø´ÙˆÛŒØ¯." }, { status: 401 });
  const body = await request.json().catch(() => null) as { fullName?: unknown; email?: unknown } | null;
  if (!body) return NextResponse.json({ successful: false, message: "Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª." }, { status: 400 });
  try {
    const customer = await updateCustomerProfile(
      auth.customer.id,
      {
        fullName: body.fullName,
        email: body.email,
      },
    );
    return NextResponse.json({ successful: true, customer });
  } catch (error) {
    return NextResponse.json({ successful: false, message: error instanceof Error ? error.message : "Ø°Ø®ÛŒØ±Ù‡ Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯." }, { status: 400 });
  }
}


