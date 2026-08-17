import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCustomerFromRequest,
} from "@/lib/customer-auth";
import {
  customerCheckoutPrefill,
  updateCustomerProfile,
  CustomerDataError,
} from "@/lib/customer-data";
import {
  readJsonBody,
} from "@/lib/security/json-body";
import {
  hasTrustedOrigin,
} from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  const auth =
    await getCustomerFromRequest(
      request,
    );

  if (!auth) {
    return NextResponse.json(
      { successful: false },
      { status: 401 },
    );
  }

  const checkout =
    await customerCheckoutPrefill(
      auth.customer.id,
    );

  return NextResponse.json(
    {
      successful: true,
      customer: {
        id: auth.customer.id,
        mobile:
          auth.customer.mobile,
        fullName:
          auth.customer.fullName,
        email:
          auth.customer.email,
      },
      checkout,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function PATCH(
  request: NextRequest,
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "مبدأ درخواست معتبر نیست.",
      },
      { status: 403 },
    );
  }

  const auth =
    await getCustomerFromRequest(
      request,
    );

  if (!auth) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "ابتدا وارد حساب شوید.",
      },
      { status: 401 },
    );
  }

  const body =
    await readJsonBody<{
      fullName?: unknown;
      email?: unknown;
    }>(
      request,
      8 * 1024,
    ).catch(() => null);

  if (!body) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "اطلاعات معتبر نیست.",
      },
      { status: 400 },
    );
  }

  try {
    const customer =
      await updateCustomerProfile(
        auth.customer.id,
        {
          fullName:
            body.fullName,
          email: body.email,
        },
      );

    return NextResponse.json({
      successful: true,
      customer,
    });
  } catch (error) {
    if (error instanceof CustomerDataError) {
      return NextResponse.json(
        {
          successful: false,
          message: error.message,
        },
        { status: 400 },
      );
    }

    console.error(
      "[Eloria Customer Profile] Unexpected update failure.",
      error,
    );

    return NextResponse.json(
      {
        successful: false,
        message: "ذخیره اطلاعات ناموفق بود.",
      },
      { status: 500 },
    );
  }
}
