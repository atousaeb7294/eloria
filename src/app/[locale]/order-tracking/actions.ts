"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createOrderTrackingToken } from "@/lib/order-tracking-token";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { serverActionIp } from "@/lib/security/request";

function normalizeMobile(value: string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return value
    .replace(/[۰-۹]/g, digit => String(fa.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String(ar.indexOf(digit)))
    .replace(/[^0-9+]/g, "");
}

export async function trackOrderAction(formData: FormData): Promise<void> {
  const locale = formData.get("locale") === "en" ? "en" : "fa";
  const orderNumber = String(formData.get("orderNumber") ?? "").trim().toUpperCase().slice(0, 32);
  const mobile = normalizeMobile(String(formData.get("mobile") ?? "")).slice(0, 20);
  const ip = await serverActionIp();

  const [ipRate, mobileRate] = await Promise.all([
    consumeRateLimit({ key: `order-tracking-ip:${ip}`, limit: 12, windowMs: 15 * 60_000 }),
    consumeRateLimit({ key: `order-tracking-mobile:${mobile}`, limit: 6, windowMs: 15 * 60_000 }),
  ]);

  if (!ipRate.allowed || !mobileRate.allowed) {
    redirect(`/${locale}/order-tracking?error=rate-limited`);
  }

  if (!orderNumber || mobile.length < 10) {
    redirect(`/${locale}/order-tracking?error=invalid`);
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber, customerMobile: mobile },
    select: { id: true },
  });

  if (!order) {
    await new Promise(resolve => setTimeout(resolve, 350));
    redirect(`/${locale}/order-tracking?error=not-found`);
  }

  const token = createOrderTrackingToken(order.id);
  redirect(`/${locale}/order-tracking?token=${encodeURIComponent(token)}`);
}
