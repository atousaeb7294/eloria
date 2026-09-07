"use client";

import Link from "next/link";
import { BellRing, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

type ProductWatchButtonProps = {
  locale: "fa" | "en";
  slug: string;
};

export function ProductWatchButton({ locale, slug }: ProductWatchButtonProps) {
  const fa = locale === "fa";
  const [state, setState] = useState<"loading" | "guest" | "ready" | "error">("loading");
  const [watched, setWatched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/customer/watches?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) {
          setState("guest");
          return;
        }
        const data = await response.json().catch(() => null) as { successful?: boolean; watched?: boolean } | null;
        if (!response.ok || !data?.successful) {
          setState("error");
          return;
        }
        setWatched(data.watched === true);
        setState("ready");
      })
      .catch(() => active && setState("error"));
    return () => { active = false; };
  }, [slug]);

  async function toggle() {
    setBusy(true);
    try {
      const response = await fetch("/api/customer/watches", {
        method: watched ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (response.status === 401) {
        setState("guest");
        return;
      }
      const data = await response.json().catch(() => null) as { successful?: boolean; watched?: boolean } | null;
      if (!response.ok || !data?.successful) throw new Error("watch-failed");
      setWatched(data.watched === true);
      setState("ready");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return <div className="mt-3 flex min-h-10 items-center gap-2 text-xs text-[#c9bc9d]/55"><LoaderCircle className="size-3.5 animate-spin" />{fa ? "بررسی پیگیری…" : "Checking alerts…"}</div>;
  }

  if (state === "guest") {
    return (
      <Link
        href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/products/${slug}`)}`}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d8bd72]/20 px-4 text-xs text-[#d9c693]/75 transition hover:border-[#d8bd72]/40 hover:text-[#efd991]"
      >
        <BellRing className="size-3.5" />
        {fa ? "برای اعلان قیمت و موجودی وارد شوید" : "Sign in for price and stock alerts"}
      </Link>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={busy || state === "error"}
        onClick={() => void toggle()}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d8bd72]/20 bg-black/10 px-4 text-xs text-[#d9c693]/80 transition hover:border-[#d8bd72]/45 hover:bg-[#d8bd72]/[.06] hover:text-[#f2dca0] disabled:opacity-45"
      >
        {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <BellRing className="size-3.5" />}
        {state === "error"
          ? (fa ? "پیگیری فعلاً در دسترس نیست" : "Alerts are temporarily unavailable")
          : watched
            ? (fa ? "اعلان قیمت و موجودی فعال است" : "Price and stock alerts are on")
            : (fa ? "پیگیری تغییر قیمت و موجودی" : "Watch price and stock")}
      </button>
      {state === "ready" ? <p className="mt-2 text-[11px] leading-5 text-[#c4b694]/48">{watched ? <Link href={`/${locale}/profile/watches`} className="text-[#dfc779]/80 underline underline-offset-4">{fa ? "مدیریت پیگیری‌ها در حساب مشتری" : "Manage watches in your account"}</Link> : null}{watched ? " · " : null}{fa ? "اعلان‌ها داخل پنل مشتری نمایش داده می‌شوند؛ موجودی و مبلغ نهایی هنگام سفارش دوباره تأیید می‌شود." : "Alerts appear in your customer account; final availability and price are confirmed at checkout."}</p> : null}
    </div>
  );
}
