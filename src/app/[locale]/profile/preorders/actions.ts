"use server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
export async function claimPreorders(locale: string) {
  const auth = await getCurrentCustomer();
  if (!auth?.customer.mobileVerifiedAt)
    throw new Error("شمارهٔ همراه باید در همین حساب تأیید شده باشد.");
  await prisma.preorderRequest.updateMany({
    where: { customerId: null, phone: auth.customer.mobile },
    data: { customerId: auth.customer.id },
  });
  revalidatePath(`/${locale === "en" ? "en" : "fa"}/profile/preorders`);
}
