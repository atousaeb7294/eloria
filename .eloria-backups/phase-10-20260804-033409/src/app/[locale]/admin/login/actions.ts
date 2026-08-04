"use server";

import {
  redirect,
} from "next/navigation";

import { consumeRateLimit } from "@/lib/security/rate-limit";
import { serverActionIp } from "@/lib/security/request";

import {
  createAdminSession,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export type AdminLoginState = {
  error: string | null;
};

function normalizeLocale(
  value: FormDataEntryValue | null,
): "fa" | "en" {
  return value === "en"
    ? "en"
    : "fa";
}

export async function adminLoginAction(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const locale =
    normalizeLocale(
      formData.get("locale"),
    );

  const rate = consumeRateLimit({
    key: `admin-login:${await serverActionIp()}`,
    limit: 5,
    windowMs: 15 * 60_000,
  });

  if (!rate.allowed) {
    return {
      error: `ورود موقتاً قفل شده است. ${rate.retryAfterSeconds} ثانیه دیگر دوباره تلاش کنید.`,
    };
  }

  if (!isAdminConfigured()) {
    return {
      error:
        "ورود مدیر هنوز در فایل .env تنظیم نشده است.",
    };
  }

  const passwordValue =
    formData.get("password");

  const password =
    typeof passwordValue ===
    "string"
      ? passwordValue
      : "";

  if (
    !verifyAdminPassword(
      password,
    )
  ) {
    await new Promise(
      (resolve) =>
        setTimeout(resolve, 650),
    );

    return {
      error:
        "رمز ورود مدیر صحیح نیست.",
    };
  }

  await createAdminSession();

  redirect(
    `/${locale}/admin`,
  );
}
