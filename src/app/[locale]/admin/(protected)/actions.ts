"use server";

import {
  redirect,
} from "next/navigation";

import {
  clearAdminSession,
} from "@/lib/admin-auth";

export async function adminLogoutAction(
  formData: FormData,
): Promise<void> {
  const locale =
    formData.get("locale") ===
    "en"
      ? "en"
      : "fa";

  await clearAdminSession();

  redirect(
    `/${locale}/admin/login`,
  );
}
