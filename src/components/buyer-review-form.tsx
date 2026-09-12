"use client";
import { useState, type FormEvent } from "react";
export function BuyerReviewForm({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch(
        `/api/products/${encodeURIComponent(slug)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: data.get("displayName"),
            rating: Number(data.get("rating")),
            body: data.get("body"),
          }),
        },
      );
      const result = await res.json();
      setMessage(result.message);
      if (res.ok) form.reset();
    } catch {
      setMessage("ارتباط برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }
  const style =
    "block w-full rounded-xl border border-[#d9b85f]/30 bg-[#041b13] p-3 mt-2";
  return (
    <form onSubmit={submit} className="mt-6 space-y-4" dir="rtl">
      <p className="text-sm leading-7">
        برای ثبت نظر وارد حسابی شوید که خرید را با آن انجام داده‌اید. نام نمایشی
        و نظر شما پس از تأیید مدیر عمومی می‌شود؛ شماره، نشانی یا اطلاعات خصوصی
        ننویسید.
      </p>
      <label className="block">
        نام نمایشی
        <input
          name="displayName"
          required
          minLength={2}
          maxLength={60}
          className={style}
        />
      </label>
      <label className="block">
        امتیاز
        <select
          aria-label="امتیاز"
          name="rating"
          className={style}
          defaultValue="5"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} از ۵
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        تجربهٔ خرید
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          className={style}
        />
      </label>
      <button
        disabled={busy}
        className="rounded-full border border-[#d9b85f]/40 px-6 py-3 disabled:opacity-50"
      >
        {busy ? "در حال ثبت…" : "ارسال برای بررسی"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
