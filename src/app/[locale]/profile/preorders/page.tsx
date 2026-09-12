import { claimPreorders } from "./actions";
import Link from "next/link";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { preorderLabels } from "@/lib/buyer-commerce-policy";
export const dynamic = "force-dynamic";
export default async function Preorders({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const auth = await getCurrentCustomer();
  if (!auth)
    return (
      <main className="p-10">
        <Link href={`/${locale}/profile`}>
          برای پیگیری وارد حساب کاربری شوید.
        </Link>
      </main>
    );

  const requests = await prisma.preorderRequest.findMany({
    where: { customerId: auth.customer.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const products = await prisma.product.findMany({
    where: {
      id: { in: requests.map((r) => r.productId) },
      status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
      collection: { isActive: true },
    },
    select: { id: true, slug: true, nameFa: true },
  });
  return (
    <main
      dir="rtl"
      className="mx-auto min-h-screen max-w-3xl p-6 pt-28 text-[#f6e8c6]"
    >
      <h1 className="text-2xl">پیگیری پیش‌سفارش‌های من</h1>
      {auth.customer.mobileVerifiedAt && (
        <form action={claimPreorders.bind(null, locale)}>
          <button className="mt-5 rounded-full border border-[#d9b85f]/40 p-3">
            افزودن درخواست‌های ثبت‌شده با شمارهٔ تأییدشدهٔ من
          </button>
        </form>
      )}
      <p className="mt-4">
        درخواست‌های مهمان با شمارهٔ همراه تأییدشدهٔ همین حساب قابل پیگیری‌اند.
        برای درخواست‌های قدیمی از پشتیبانی کمک بگیرید.
      </p>
      {requests.length === 0 && <p className="mt-6">درخواستی یافت نشد.</p>}
      {requests.map((r) => {
        const p = products.find((p) => p.id === r.productId);
        return (
          <article
            key={r.id}
            className="mt-6 rounded-xl border border-[#d9b85f]/30 p-5 space-y-3 break-words"
          >
            <h2>{p?.nameFa || "محصول"}</h2>
            <p>
              {preorderLabels[r.status]} · تعداد {r.quantity}
            </p>
            <p>{r.deliveryNote}</p>
            <p className="text-xs">{r.id}</p>
            {r.status === "READY" && p && (
              <>
                <Link
                  className="inline-block rounded-full border border-[#d9b85f]/40 px-5 py-3"
                  href={`/${locale}/products/${p.slug}${r.variantId ? `?variant=${r.variantId}` : ""}`}
                >
                  مشاهدهٔ قیمت جاری و خرید
                </Link>
                <p className="text-sm">
                  موجودی و قیمت در مرحلهٔ خرید دوباره بررسی می‌شود. با همین حساب
                  خرید کنید تا پشتیبانی سفارش را به درخواست متصل کند.
                </p>
              </>
            )}
          </article>
        );
      })}
    </main>
  );
}
