import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { cancelCustomerOrder, CustomerOrderError } from "@/lib/customer-order-operations";
import { hasTrustedOrigin } from "@/lib/security/request";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ successful: false, message: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const auth = await getCustomerFromRequest(request);
  if (!auth) return NextResponse.json({ successful: false, message: "ابتدا وارد حساب شوید." }, { status: 401 });
  const { id } = await context.params;
  try {
    const order = await cancelCustomerOrder(auth.customer.id, id);
    return NextResponse.json({ successful: true, order });
  } catch (error) {
    if (error instanceof CustomerOrderError) {
      return NextResponse.json({ successful: false, message: error.message }, { status: 409 });
    }
    console.error("[Eloria Order Cancellation] Unexpected cancellation failure.", error);
    return NextResponse.json({ successful: false, message: "لغو سفارش ناموفق بود. لطفاً دوباره تلاش کنید." }, { status: 500 });
  }
}
