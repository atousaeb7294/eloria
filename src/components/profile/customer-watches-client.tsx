"use client";

import Image from "next/image";
import Link from "next/link";
import { BellRing, ChevronRight, LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Watch = {
  id: string;
  notifyOnPriceDrop: boolean;
  notifyOnRestock: boolean;
  lastObservedPriceToman: string | null;
  lastObservedInStock: boolean | null;
  createdAt: string;
  updatedAt: string;
  product: { slug: string; nameFa: string; nameEn: string; status: string; images: Array<{ imageUrl: string }> };
};

function toman(value: string | null, fa: boolean): string {
  if (!value) return fa ? "هنوز محاسبه نشده" : "Not calculated yet";
  return `${new Intl.NumberFormat(fa ? "fa-IR" : "en-US").format(Number(value))} ${fa ? "تومان" : "Toman"}`;
}

export function CustomerWatchesClient({ locale, enabled, watches }: { locale: "fa" | "en"; enabled: boolean; watches: Watch[] }) {
  const fa = locale === "fa";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function remove(slug: string) {
    setBusy(slug);
    setMessage(null);
    try {
      const response = await fetch("/api/customer/watches", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
      const data = await response.json().catch(() => null) as { successful?: boolean; message?: string } | null;
      if (!response.ok || !data?.successful) throw new Error(data?.message ?? "watch-remove-failed");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (fa ? "حذف پیگیری ناموفق بود." : "Unable to remove watch."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main dir={fa ? "rtl" : "ltr"} className="mx-auto max-w-5xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
      <Link href={`/${locale}/profile`} className="inline-flex items-center gap-2 text-xs text-[#d8c17c]/72"><ChevronRight className="size-4" />{fa ? "بازگشت به حساب مشتری" : "Back to account"}</Link>
      <section className="mt-5 rounded-[2rem] border border-[#d8b967]/14 bg-[linear-gradient(145deg,rgba(8,42,30,.84),rgba(2,18,13,.9))] p-6 sm:p-8"><div className="flex items-start gap-4"><span className="grid size-12 place-items-center rounded-2xl border border-[#d8b967]/20 bg-[#d8b967]/[.08] text-[#e5ca79]"><BellRing className="size-5" /></span><div><p className="text-xs text-[#d9c277]/65">{fa ? "اعلان داخل حساب" : "In-account alerts"}</p><h1 className={fa ? "font-persian-title mt-2 text-3xl text-[#f2e6c9]" : "mt-2 text-3xl font-semibold text-[#f2e6c9]"}>{fa ? "پیگیری قیمت و موجودی" : "Price and stock watches"}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#cbbd9a]/60">{fa ? "در زمان اجرای بررسی روزانه، کاهش قیمت نمایش‌داده‌شده و بازگشت موجودی به اعلان‌های همین حساب افزوده می‌شود. قیمت و موجودی نهایی در مرحلهٔ سفارش دوباره تأیید می‌گردد." : "During the daily check, price drops and restocks are added to this account's notifications. Final price and availability are reconfirmed at checkout."}</p></div></div></section>
      {message ? <p className="mt-5 rounded-2xl border border-red-300/20 bg-red-950/20 p-4 text-sm text-red-100">{message}</p> : null}
      {!enabled ? <section className="mt-6 rounded-3xl border border-[#d8b967]/12 bg-black/15 p-6 text-sm text-[#cbbd9a]/65">{fa ? "پیگیری محصول در حال حاضر فعال نیست." : "Product watches are currently disabled."}</section> : null}
      {enabled ? <section className="mt-6 grid gap-4 sm:grid-cols-2">{watches.map((watch) => <article key={watch.id} className="rounded-3xl border border-[#d8b967]/12 bg-[linear-gradient(145deg,rgba(6,33,24,.72),rgba(2,17,12,.72))] p-4"><div className="flex gap-3"><div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-black/20">{watch.product.images[0]?.imageUrl ? <Image src={watch.product.images[0].imageUrl} alt={fa ? watch.product.nameFa : watch.product.nameEn} fill sizes="64px" className="object-cover" /> : null}</div><div className="min-w-0 flex-1"><Link href={`/${locale}/products/${watch.product.slug}`} className="text-sm text-[#ead9b1]">{fa ? watch.product.nameFa : watch.product.nameEn}</Link><p className="mt-2 text-xs text-[#c5b797]/52">{toman(watch.lastObservedPriceToman, fa)}</p><p className="mt-1 text-[11px] text-[#d9bd72]/65">{watch.lastObservedInStock === null ? (fa ? "در انتظار نخستین بررسی" : "Waiting for first check") : watch.lastObservedInStock ? (fa ? "آخرین وضعیت: موجود" : "Last status: in stock") : (fa ? "آخرین وضعیت: ناموجود" : "Last status: out of stock")}</p></div></div><button disabled={busy === watch.product.slug} onClick={() => void remove(watch.product.slug)} className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-red-300/16 px-3 text-xs text-red-100/65 disabled:opacity-50">{busy === watch.product.slug ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}{fa ? "حذف پیگیری" : "Remove watch"}</button></article>)}{!watches.length ? <article className="rounded-3xl border border-[#d8b967]/12 bg-black/15 p-6 text-sm leading-7 text-[#cbbd9a]/65 sm:col-span-2">{fa ? "هنوز محصولی را پیگیری نمی‌کنید. از صفحهٔ هر محصول، «پیگیری تغییر قیمت و موجودی» را فعال کنید." : "You are not watching a product yet. Enable price and stock watch from a product page."}</article> : null}</section> : null}
    </main>
  );
}
