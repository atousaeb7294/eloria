"use client";
import { useRef, useState, type FormEvent } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
export function ProductPreorderForm({ locale, slug, variantId }: { locale: "fa" | "en"; slug: string; variantId: string | null }) {
  const fa = locale === "fa";
  const busy = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ reference: string; message: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current || receipt) return;
    const form = new FormData(event.currentTarget);
    const input = { locale, variantId, name: String(form.get("name") ?? "").trim(), phone: String(form.get("phone") ?? "").trim(), quantity: Number(form.get("quantity")), notes: String(form.get("notes") ?? "").trim() };
    const fingerprint = JSON.stringify({ slug, ...input });
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    busy.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(slug)}/preorder`, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ ...input, requestId: request.current.id, turnstileToken: token }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.successful !== true || typeof data.reference !== "string") throw new Error(data?.message || (fa ? "ثبت درخواست انجام نشد؛ دوباره تلاش کنید." : "Unable to record your request. Please retry."));
      setReceipt({ reference: data.reference, message: data.message });
    } catch (err) { setError(err instanceof Error ? err.message : (fa ? "خطای ارتباط؛ دوباره تلاش کنید." : "Connection error. Please retry.")); setToken(null); setAttempt(value => value + 1); }
    finally { busy.current = false; setPending(false); }
  }
  const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-[#d9b85f]/25 bg-[#031a13] px-4 py-3 text-[#f6e8c6] outline-none focus:border-[#d9b85f]";
  if (receipt) return <div role="status" className="mt-8 rounded-2xl border border-[#d9b85f]/30 bg-[#061c15] p-6 leading-8"><p>{receipt.message}</p><p className="mt-4 text-sm">{fa ? "کد پیگیری درخواست:" : "Request reference:"}</p><p dir="ltr" className="break-all text-sm text-[#d9b85f]">{receipt.reference}</p><p className="mt-4 text-sm">{fa ? "کد را نگه دارید؛ پیگیری از طریق پشتیبانی الوریا و شمارهٔ ثبت‌شده انجام می‌شود." : "Keep this reference. Eloria support will follow up using your phone number."}</p></div>;
  return <form onSubmit={submit} className="mt-7 space-y-5 rounded-2xl border border-[#d9b85f]/25 bg-[#061c15]/90 p-5 sm:p-7">
    <p className="text-sm leading-8 text-[#d5c7a7]">{fa ? "این محصول فعلاً ناموجود است. درخواست شما برای بررسی تأمین ثبت می‌شود؛ پیش از پرداخت، امکان تأمین، زمان تحویل و قیمت نهایی را با شما هماهنگ می‌کنیم." : "This item is currently out of stock. Submit a request and we will confirm availability, delivery time and final price before any payment."}</p>
    <label className="block text-sm">{fa ? "نام و نام خانوادگی" : "Full name"}<input name="name" autoComplete="name" required minLength={2} maxLength={120} className={inputClass} /></label>
    <label className="block text-sm">{fa ? "شماره همراه" : "Mobile number"}<input name="phone" type="tel" autoComplete="tel" required maxLength={30} placeholder="09121234567" className={inputClass} /></label>
    <label className="block text-sm">{fa ? "تعداد درخواستی" : "Requested quantity"}<input name="quantity" type="number" inputMode="numeric" min={1} max={20} defaultValue={1} required className={inputClass} /></label>
    <label className="block text-sm">{fa ? "توضیحات یا اندازهٔ دلخواه (اختیاری)" : "Notes or preferred size (optional)"}<textarea name="notes" maxLength={500} rows={3} className={inputClass} /></label>
    <TurnstileWidget key={attempt} locale={locale} action="support-contact" onTokenChange={setToken} />
    {error && <p role="alert" className="text-sm leading-7 text-red-200">{error}</p>}
    <button disabled={pending} type="submit" className="min-h-13 w-full rounded-full border border-[#d9b85f]/50 bg-[#d9b85f]/15 px-5 py-3 text-[#f6e8c6] disabled:opacity-50">{pending ? (fa ? "در حال ثبت…" : "Submitting…") : (fa ? "ثبت درخواست پیش‌سفارش" : "Submit preorder request")}</button>
    <p className="text-xs leading-6 text-[#d5c7a7]">{fa ? "ثبت این درخواست هزینه‌ای ندارد و به معنی خرید قطعی یا رزرو موجودی نیست." : "This request is free and does not confirm a purchase or reserve stock."}</p>
  </form>;
}
