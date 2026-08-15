"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, Phone, ShieldCheck } from "lucide-react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { readTreasury } from "@/lib/treasury-storage";

export function CustomerLoginClient({ locale, nextPath }: { locale: "fa" | "en"; nextPath?: string | null }) {
  const fa = locale === "fa";
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const onTokenChange = useCallback((token: string | null) => setTurnstileToken(token), []);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setMessage(null); setDevCode(null);
    try {
      const response = await fetch("/api/customer/auth/request-otp", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ mobile, turnstileToken }),
      });
      const data = await response.json().catch(() => null) as { successful?: boolean; challengeId?: string; message?: string; developmentCode?: string } | null;
      if (!response.ok || !data?.successful || !data.challengeId) throw new Error(data?.message || (fa ? "ارسال کد ناموفق بود." : "Could not send the code."));
      setChallengeId(data.challengeId);
      setDevCode(data.developmentCode ?? null);
      setMessage(fa ? "کد ورود ارسال شد." : "Login code sent.");
    } catch (error) { setMessage(error instanceof Error ? error.message : (fa ? "ارسال کد ناموفق بود." : "Could not send the code.")); }
    finally { setLoading(false); }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!challengeId) return;
    setLoading(true); setMessage(null);
    try {
      const response = await fetch("/api/customer/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ challengeId, mobile, code }),
      });
      const data = await response.json().catch(() => null) as { successful?: boolean; message?: string } | null;
      if (!response.ok || !data?.successful) throw new Error(data?.message || (fa ? "ورود ناموفق بود." : "Login failed."));

      const localFavorites = readTreasury().map(item => item.slug);
      if (localFavorites.length) {
        await fetch("/api/customer/favorites", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs: localFavorites }),
        }).catch(() => undefined);
      }

      const safeNext = nextPath && nextPath.startsWith(`/${locale}/`) ? nextPath : `/${locale}/profile`;
      router.replace(safeNext);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : (fa ? "ورود ناموفق بود." : "Login failed.")); }
    finally { setLoading(false); }
  }

  return (
    <section dir={fa ? "rtl" : "ltr"} className="mx-auto max-w-xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
      <div className="overflow-hidden rounded-[32px] border border-[#d8b967]/18 bg-[linear-gradient(155deg,rgba(7,40,29,.90),rgba(2,18,13,.94))] p-6 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-9">
        <div className="flex items-center gap-3 text-[#e5ca7c]">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs">{fa ? "ورود امن مشتری" : "Secure customer access"}</span>
        </div>
        <h1 className={fa ? "font-persian-title mt-5 text-3xl text-[#f3e6c5]" : "mt-5 text-3xl font-semibold text-[#f3e6c5]"}>
          {fa ? "حساب الوریا" : "Your Eloria account"}
        </h1>
        <p className="mt-4 text-sm leading-8 text-[#cdbf9d]/65">
          {fa ? "با شماره موبایل وارد شوید. سفارش‌ها، آدرس‌ها، علاقه‌مندی‌ها و اعلان‌های شما به همین حساب متصل می‌شوند." : "Sign in with your mobile number. Orders, addresses, favorites and notifications are linked to this account."}
        </p>

        {!challengeId ? (
          <form onSubmit={requestCode} className="mt-8 space-y-4">
            <label className="block text-xs text-[#d9c79e]/65">{fa ? "شماره موبایل" : "Mobile number"}</label>
            <div className="relative">
              <Phone className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d7bd72]/50" />
              <input value={mobile} onChange={e => setMobile(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="09121234567" className="h-13 w-full rounded-2xl border border-[#d8b967]/14 bg-black/20 ps-11 pe-4 text-sm text-[#f1e5c9] outline-none focus:border-[#e2c779]/40" />
            </div>
            <TurnstileWidget locale={locale} onTokenChange={onTokenChange} />
            <button disabled={loading} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[#e3c873]/30 bg-[#143c2d] text-sm text-[#efd991] disabled:opacity-50">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {fa ? "دریافت کد ورود" : "Send login code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-8 space-y-4">
            <label className="block text-xs text-[#d9c79e]/65">{fa ? "کد ۶ رقمی" : "6-digit code"}</label>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="h-14 w-full rounded-2xl border border-[#d8b967]/14 bg-black/20 px-4 text-center font-mono text-xl tracking-[.35em] text-[#f1e5c9] outline-none focus:border-[#e2c779]/40" />
            {devCode ? <p className="rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3 text-xs text-amber-100/70">DEV OTP: {devCode}</p> : null}
            <button disabled={loading || code.length !== 6} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[#e3c873]/30 bg-[#143c2d] text-sm text-[#efd991] disabled:opacity-50">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {fa ? "ورود به حساب" : "Sign in"}
            </button>
            <button type="button" onClick={() => { setChallengeId(null); setCode(""); setMessage(null); }} className="w-full py-2 text-xs text-[#c5b58f]/55">
              {fa ? "تغییر شماره / ارسال دوباره" : "Change number / resend"}
            </button>
          </form>
        )}

        {message ? <p className="mt-5 rounded-xl border border-[#d8b967]/10 bg-black/15 p-3 text-xs leading-6 text-[#ded0ad]/75">{message}</p> : null}
      </div>
    </section>
  );
}
