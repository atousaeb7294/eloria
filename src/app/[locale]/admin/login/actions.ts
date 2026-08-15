"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createAdminSession,
  isAdminConfigured,
  recordAdminSecurityEvent,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { serverActionIp } from "@/lib/security/request";

export type AdminLoginState = { error: string | null };

export async function adminLoginAction(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const locale = formData.get("locale") === "en" ? "en" : "fa";
  const ip = await serverActionIp();
  const values = await headers();
  const userAgent = values.get("user-agent");
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const totpCode = String(formData.get("totpCode") ?? "").trim();

  const [ipRate, identityRate] = await Promise.all([
    consumeRateLimit({
      key: `admin-login-ip:${ip}`,
      limit: 12,
      windowMs: 15 * 60_000,
    }),
    consumeRateLimit({
      key: `admin-login:${ip}:${username.toLowerCase()}`,
      limit: 5,
      windowMs: 15 * 60_000,
    }),
  ]);

  if (!ipRate.allowed || !identityRate.allowed) {
    const retryAfterSeconds = Math.max(
      ipRate.retryAfterSeconds,
      identityRate.retryAfterSeconds,
    );

    await recordAdminSecurityEvent({
      eventType: "LOGIN_RATE_LIMITED",
      successful: false,
      ip,
      userAgent,
    });

    return {
      error: `ورود موقتاً قفل شده است. ${retryAfterSeconds} ثانیه دیگر دوباره تلاش کنید.`,
    };
  }

  if (!isAdminConfigured()) {
    return {
      error:
        process.env.NODE_ENV === "production"
          ? "ورود مدیریت موقتاً در دسترس نیست."
          : "تنظیمات امنیتی مدیر در فایل .env کامل نیست.",
    };
  }

  if (!verifyAdminCredentials({ username, password, totpCode })) {
    await recordAdminSecurityEvent({
      eventType: "LOGIN_FAILED",
      successful: false,
      ip,
      userAgent,
      payload: { usernameLength: username.length },
    });

    await new Promise(resolve => setTimeout(resolve, 750));
    return { error: "نام کاربری، رمز یا کد امنیتی صحیح نیست." };
  }

  await createAdminSession({ ip, userAgent });
  await recordAdminSecurityEvent({
    eventType: "LOGIN_SUCCEEDED",
    successful: true,
    ip,
    userAgent,
  });

  redirect(`/${locale}/admin`);
}
