"use server";

import {
  revalidatePath,
} from "next/cache";
import {
  redirect,
} from "next/navigation";

import {
  hasValidAdminSession,
} from "@/lib/admin-auth";
import {
  markReviewedPaymentRefunded,
  saveShipmentDetails,
  transitionOrderByAdmin,
  OrderOperationError,
  type AdminOrderTransition,
} from "@/lib/order-operations";

class AdminOrderActionError extends Error {
  constructor(
    message: string,
  ) {
    super(message);
    this.name =
      "AdminOrderActionError";
  }
}

function publicOrderActionError(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof
      OrderOperationError ||
    error instanceof
      AdminOrderActionError
  ) {
    return error.message;
  }

  console.error(
    "[Eloria Admin Order Action] Unexpected error.",
    error,
  );

  return fallback;
}

function localeOf(
  value: string,
) {
  return value === "en"
    ? "en"
    : "fa";
}

function text(
  form: FormData,
  key: string,
  max: number,
  required = false,
) {
  const raw =
    form.get(key);

  const value =
    typeof raw ===
    "string"
      ? raw.trim()
      : "";

  if (
    required &&
    !value
  ) {
    throw new AdminOrderActionError(
      "فیلدهای الزامی را کامل کنید.",
    );
  }

  if (
    value.length > max
  ) {
    throw new AdminOrderActionError(
      "طول فیلد بیش از حد مجاز است.",
    );
  }

  return value || null;
}

async function session() {
  if (
    !(
      await hasValidAdminSession()
    )
  ) {
    throw new AdminOrderActionError(
      "نشست مدیریت منقضی شده است.",
    );
  }
}

function refresh(
  locale: string,
  orderId: string,
) {
  revalidatePath(
    `/${locale}/admin/orders/${orderId}`,
  );
  revalidatePath(
    `/${locale}/admin/orders`,
  );
  revalidatePath(
    `/${locale}/order-tracking`,
  );
}

export async function transitionAdminOrderAction(
  orderId: string,
  localeValue: string,
  form: FormData,
): Promise<void> {
  await session();

  const locale =
    localeOf(
      localeValue,
    );

  const target =
    text(
      form,
      "target",
      40,
      true,
    ) as
      AdminOrderTransition;

  if (
    ![
      "CANCELLED",
      "PROCESSING",
      "SHIPPED",
      "COMPLETED",
    ].includes(
      target,
    )
  ) {
    redirect(
      `/${locale}/admin/orders/${orderId}?workflowError=invalid-target`,
    );
  }

  try {
    await transitionOrderByAdmin({
      orderId,
      target,
      note: text(
        form,
        "note",
        1000,
      ),
    });
  } catch (error) {
    redirect(
      `/${locale}/admin/orders/${orderId}?workflowError=${encodeURIComponent(
        publicOrderActionError(
          error,
          "تغییر وضعیت سفارش انجام نشد.",
        ),
      )}`,
    );
  }

  refresh(
    locale,
    orderId,
  );

  redirect(
    `/${locale}/admin/orders/${orderId}?workflowSaved=1`,
  );
}

export async function saveAdminShipmentAction(
  orderId: string,
  localeValue: string,
  form: FormData,
): Promise<void> {
  await session();

  const locale =
    localeOf(
      localeValue,
    );

  try {
    await saveShipmentDetails({
      orderId,
      carrier:
        text(
          form,
          "carrier",
          120,
          true,
        )!,
      trackingCode:
        text(
          form,
          "trackingCode",
          160,
          true,
        )!,
      note:
        text(
          form,
          "note",
          1000,
        ),
    });
  } catch (error) {
    redirect(
      `/${locale}/admin/orders/${orderId}?shipmentError=${encodeURIComponent(
        publicOrderActionError(
          error,
          "ثبت اطلاعات ارسال انجام نشد.",
        ),
      )}`,
    );
  }

  refresh(
    locale,
    orderId,
  );

  redirect(
    `/${locale}/admin/orders/${orderId}?shipmentSaved=1`,
  );
}

export async function markAdminPaymentRefundedAction(
  paymentAttemptId: string,
  orderId: string,
  localeValue: string,
  form: FormData,
): Promise<void> {
  await session();

  const locale =
    localeOf(
      localeValue,
    );

  try {
    await markReviewedPaymentRefunded({
      orderId,
      paymentAttemptId,
      refundReference:
        text(
          form,
          "refundReference",
          160,
          true,
        )!,
      note:
        text(
          form,
          "note",
          1000,
        ),
    });
  } catch (error) {
    redirect(
      `/${locale}/admin/orders/${orderId}?paymentError=${encodeURIComponent(
        publicOrderActionError(
          error,
          "ثبت بازپرداخت انجام نشد.",
        ),
      )}`,
    );
  }

  refresh(
    locale,
    orderId,
  );

  redirect(
    `/${locale}/admin/orders/${orderId}?paymentRefunded=1`,
  );
}
