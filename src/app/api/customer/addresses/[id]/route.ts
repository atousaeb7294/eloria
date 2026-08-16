import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCustomerFromRequest,
} from "@/lib/customer-auth";
import {
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@/lib/customer-data";
import {
  readJsonBody,
} from "@/lib/security/json-body";
import {
  hasTrustedOrigin,
} from "@/lib/security/request";

export const runtime = "nodejs";

type Ctx = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: Ctx,
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
      { successful: false },
      { status: 401 },
    );
  }

  const { id } =
    await context.params;

  const body =
    await readJsonBody<unknown>(
      request,
      16 * 1024,
    ).catch(() => null);

  if (!body) {
    return NextResponse.json(
      {
        successful: false,
        message:
          "اطلاعات آدرس معتبر نیست.",
      },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({
      successful: true,
      address:
        await updateCustomerAddress(
          auth.customer.id,
          id,
          body,
        ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        successful: false,
        message:
          error instanceof Error
            ? error.message
            : "ویرایش آدرس ناموفق بود.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: Ctx,
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { successful: false },
      { status: 403 },
    );
  }

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

  const { id } =
    await context.params;

  try {
    await deleteCustomerAddress(
      auth.customer.id,
      id,
    );

    return NextResponse.json({
      successful: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        successful: false,
        message:
          error instanceof Error
            ? error.message
            : "حذف آدرس ناموفق بود.",
      },
      { status: 400 },
    );
  }
}
