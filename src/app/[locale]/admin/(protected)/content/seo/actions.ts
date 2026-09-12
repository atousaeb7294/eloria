"use server";
import { hasValidAdminSession } from "@/lib/admin-auth";
import { repairSeoBatch } from "@/lib/seo-autopilot";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export async function repairSeoAction(locale: string) {
  if (!(await hasValidAdminSession())) throw new Error("نشست مدیریت معتبر نیست.");
  const lang = locale === "en" ? "en" : "fa";
  const result = await repairSeoBatch();
  for (const l of ["fa","en"]) { revalidatePath(`/${l}/admin/content`); revalidatePath(`/${l}/admin/content/seo`); }
  redirect(`/${lang}/admin/content/seo?repaired=${result.changed}`);
}
