"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, Phone, ShieldCheck, UserRound } from "lucide-react";
import { TurnstileWidget, type TurnstileState } from "@/components/turnstile-widget";
import type { CustomerAuthChannelAvailability } from "@/lib/customer-auth-channels";
import { readTreasury } from "@/lib/treasury-storage";

type AuthMode = "PASSWORD" | "OTP" | "SIGNUP" | "RESET";
type PasswordOtpPurpose = "SIGNUP" | "PASSWORD_RESET";

type AuthResponse = {
  successful?: boolean;
  challengeId?: string | null;
  developmentCode?: string;
  message?: string;
};

export function CustomerLoginClient({
  locale,
  nextPath,
  channelAvailability,
}: {
  locale: "fa" | "en";
  nextPath?: string | null;
  channelAvailability: CustomerAuthChannelAvailability;
}) {
  const fa = locale === "fa";
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("PASSWORD");
  const [mobile, setMobile] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileState, setTurnstileState] = useState<TurnstileState>("loading");
  const [turnstileGeneration, setTurnstileGeneration] = useState(0);

  const securityCheckComplete = turnstileState === "disabled" || Boolean(turnstileToken);
  const needsSms = mode !== "PASSWORD";
  const turnstileAction = mode === "PASSWORD"
    ? "customer-password-login"
    : mode === "OTP"
      ? "customer-login"
      : "customer-password-recovery";

  const onTokenChange = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  function resetFlow(nextMode: AuthMode) {
    setMode(nextMode);
    setChallengeId(null);
    setCode("");
    setDevCode(null);
    setMessage(null);
    setTurnstileToken(null);
    setTurnstileGeneration(value => value + 1);
  }

  function passwordModeMessage() {
    return fa
      ? "رمز عبور خود را وارد کنید؛ اگر هنوز رمز ندارید، از عضویت با پیامک استفاده کنید."
      : "Enter your password, or use SMS sign-up if you have not created one yet.";
  }

  async function postJson<T extends AuthResponse>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null) as T | null;
    if (!response.ok || data?.successful !== true) {
      throw new Error(data?.message || (fa ? "عملیات ناموفق بود." : "The operation failed."));
    }
    return data;
  }

  async function completeLogin() {
    const localFavorites = readTreasury().map(item => item.slug);
    if (localFavorites.length) {
      await fetch("/api/customer/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: localFavorites }),
      }).catch(() => undefined);
    }

    const safeNext = nextPath && nextPath.startsWith("/" + locale + "/")
      ? nextPath
      : "/" + locale + "/profile";
    router.replace(safeNext);
    router.refresh();
  }

  async function loginWithPassword(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await postJson("/api/customer/auth/password-login", {
        mobile,
        password,
        turnstileToken,
      });
      await completeLogin();
    } catch (error) {
      setTurnstileToken(null);
      setTurnstileGeneration(value => value + 1);
      setMessage(error instanceof Error ? error.message : (fa ? "ورود ناموفق بود." : "Login failed."));
    } finally {
      setLoading(false);
    }
  }

  function purposeForMode(): PasswordOtpPurpose {
    return mode === "RESET" ? "PASSWORD_RESET" : "SIGNUP";
  }

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    if (!channelAvailability.smsEnabled) {
      setMessage(fa ? "سامانهٔ پیامکی هنوز توسط مدیر سایت پیکربندی نشده است." : "The SMS service has not been configured yet.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setDevCode(null);
    try {
      const data = mode === "OTP"
        ? await postJson<AuthResponse>("/api/customer/auth/request-otp", {
            channel: "SMS",
            mobile,
            turnstileToken,
          })
        : await postJson<AuthResponse>("/api/customer/auth/request-password-otp", {
            purpose: purposeForMode(),
            mobile,
            turnstileToken,
          });

      if (!data.challengeId) {
        setMessage(data.message || (fa ? "اگر حسابی با این شماره وجود داشته باشد، پیامک ارسال می‌شود." : "If an account exists for this mobile, an SMS will be sent."));
        return;
      }

      setChallengeId(data.challengeId);
      setDevCode(data.developmentCode ?? null);
      setMessage(
        mode === "SIGNUP"
          ? (fa ? "کد تأیید عضویت به شمارهٔ شما ارسال شد." : "The sign-up code was sent to your mobile.")
          : mode === "RESET"
            ? (fa ? "کد بازیابی رمز به شمارهٔ شما ارسال شد." : "The password-recovery code was sent to your mobile.")
            : (fa ? "کد ورود به شمارهٔ شما ارسال شد." : "The login code was sent to your mobile."),
      );
    } catch (error) {
      setTurnstileToken(null);
      setTurnstileGeneration(value => value + 1);
      setMessage(error instanceof Error ? error.message : (fa ? "ارسال کد ناموفق بود." : "Could not send the code."));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!challengeId) return;
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "OTP") {
        await postJson("/api/customer/auth/verify-otp", {
          challengeId,
          channel: "SMS",
          mobile,
          code,
        });
      } else {
        await postJson("/api/customer/auth/verify-password-otp", {
          purpose: purposeForMode(),
          challengeId,
          mobile,
          code,
          password,
          confirmPassword,
          ...(mode === "SIGNUP" ? { fullName } : {}),
        });
      }
      await completeLogin();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (fa ? "تأیید کد ناموفق بود." : "Code verification failed."));
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = "h-13 w-full rounded-2xl border border-[#d8b967]/14 bg-black/20 px-4 text-sm text-[#f1e5c9] outline-none focus:border-[#e2c779]/40";
  const passwordFieldClass = fieldClass + " text-left";

  return (
    <section dir={fa ? "rtl" : "ltr"} className="mx-auto max-w-xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
      <div className="overflow-hidden rounded-[32px] border border-[#d8b967]/18 bg-[linear-gradient(155deg,rgba(7,40,29,.90),rgba(2,18,13,.94))] p-6 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-9">
        <div className="flex items-center gap-3 text-[#e5ca7c]"><ShieldCheck className="h-5 w-5" /><span className="text-xs">{fa ? "دسترسی امن مشتری" : "Secure customer access"}</span></div>
        <h1 className={fa ? "font-persian-title mt-5 text-3xl text-[#f3e6c5]" : "mt-5 text-3xl font-semibold text-[#f3e6c5]"}>{fa ? "حساب الوریا" : "Your Eloria account"}</h1>
        <p className="mt-4 text-sm leading-8 text-[#cdbf9d]/65">{mode === "PASSWORD" ? passwordModeMessage() : fa ? "همهٔ مسیرهای عضویت و بازیابی با شمارهٔ موبایل و کد پیامکی SMS.ir انجام می‌شود." : "Sign-up and recovery use your mobile number and an SMS.ir verification code."}</p>

        {!challengeId ? (
          <>
            <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl border border-[#d8b967]/12 bg-black/15 p-1.5">
              <button type="button" onClick={() => resetFlow("PASSWORD")} className={"flex h-11 items-center justify-center gap-2 rounded-xl text-xs transition " + (mode === "PASSWORD" ? "bg-[#173e30] text-[#efd991]" : "text-[#baa982]/55")}><KeyRound className="h-4 w-4" />{fa ? "ورود با رمز" : "Password login"}</button>
              <button type="button" disabled={!channelAvailability.smsEnabled} onClick={() => resetFlow("OTP")} className={"flex h-11 items-center justify-center gap-2 rounded-xl text-xs transition disabled:cursor-not-allowed disabled:opacity-35 " + (mode === "OTP" ? "bg-[#173e30] text-[#efd991]" : "text-[#baa982]/55")}><Phone className="h-4 w-4" />{fa ? "ورود پیامکی" : "SMS login"}</button>
            </div>

            {needsSms && !channelAvailability.smsEnabled ? <p role="alert" className="mt-4 rounded-xl border border-amber-300/20 bg-amber-950/20 p-3 text-xs leading-6 text-amber-100">{fa ? "سامانهٔ SMS.ir برای ارسال کد هنوز تنظیم نشده است." : "SMS.ir is not configured for verification codes yet."}</p> : null}

            {mode === "PASSWORD" ? (
              <form onSubmit={loginWithPassword} className="mt-6 space-y-4">
                <label className="block text-xs text-[#d9c79e]/65">{fa ? "شماره موبایل" : "Mobile number"}</label>
                <div className="relative"><Phone className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d7bd72]/50" /><input value={mobile} onChange={event => setMobile(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="09121234567" required className={fieldClass + " ps-11"} /></div>
                <label className="block text-xs text-[#d9c79e]/65">{fa ? "رمز عبور" : "Password"}</label>
                <input value={password} onChange={event => setPassword(event.target.value)} type="password" dir="ltr" autoComplete="current-password" minLength={8} maxLength={128} required className={passwordFieldClass} placeholder={fa ? "حداقل ۸ نویسه" : "At least 8 characters"} />
                <TurnstileWidget key={turnstileAction + "-" + turnstileGeneration} locale={locale} action={turnstileAction} onTokenChange={onTokenChange} onStateChange={setTurnstileState} />
                {!securityCheckComplete ? <p className="text-center text-[11px] leading-6 text-[#bcae8d]/45">{fa ? "پس از تکمیل بررسی امنیتی، ورود فعال می‌شود." : "Complete the security check to continue."}</p> : null}
                <button disabled={loading || !securityCheckComplete} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[#e3c873]/30 bg-[#143c2d] text-sm text-[#efd991] disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{fa ? "ورود به حساب" : "Sign in"}</button>
              </form>
            ) : (
              <form onSubmit={requestCode} className="mt-6 space-y-4">
                {mode === "SIGNUP" ? <><label className="block text-xs text-[#d9c79e]/65">{fa ? "نام و نام خانوادگی" : "Full name"}</label><div className="relative"><UserRound className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d7bd72]/50" /><input value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" required className={fieldClass + " ps-11"} placeholder={fa ? "نام شما" : "Your name"} /></div></> : null}
                <label className="block text-xs text-[#d9c79e]/65">{fa ? "شماره موبایل" : "Mobile number"}</label>
                <div className="relative"><Phone className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d7bd72]/50" /><input value={mobile} onChange={event => setMobile(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="09121234567" required className={fieldClass + " ps-11"} /></div>
                {mode === "SIGNUP" || mode === "RESET" ? <><label className="block text-xs text-[#d9c79e]/65">{fa ? "رمز عبور جدید" : "New password"}</label><input value={password} onChange={event => setPassword(event.target.value)} type="password" dir="ltr" autoComplete="new-password" minLength={8} maxLength={128} required className={passwordFieldClass} placeholder={fa ? "حداقل ۸ نویسه" : "At least 8 characters"} /><label className="block text-xs text-[#d9c79e]/65">{fa ? "تکرار رمز عبور" : "Confirm password"}</label><input value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} type="password" dir="ltr" autoComplete="new-password" minLength={8} maxLength={128} required className={passwordFieldClass} /></> : null}
                <TurnstileWidget key={turnstileAction + "-" + turnstileGeneration} locale={locale} action={turnstileAction} onTokenChange={onTokenChange} onStateChange={setTurnstileState} />
                {!securityCheckComplete ? <p className="text-center text-[11px] leading-6 text-[#bcae8d]/45">{fa ? "پس از تکمیل بررسی امنیتی، ارسال کد فعال می‌شود." : "Complete the security check to send the code."}</p> : null}
                <button disabled={loading || !channelAvailability.smsEnabled || !securityCheckComplete} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[#e3c873]/30 bg-[#143c2d] text-sm text-[#efd991] disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}{mode === "OTP" ? (fa ? "دریافت کد ورود" : "Send login code") : mode === "SIGNUP" ? (fa ? "دریافت کد عضویت" : "Send sign-up code") : (fa ? "دریافت کد بازیابی" : "Send recovery code")}</button>
              </form>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[#c5b58f]/55">
              {mode !== "PASSWORD" ? <button type="button" onClick={() => resetFlow("PASSWORD")} className="transition hover:text-[#efd991]">{fa ? "ورود با رمز عبور" : "Password login"}</button> : null}
              {mode !== "OTP" ? <button type="button" disabled={!channelAvailability.smsEnabled} onClick={() => resetFlow("OTP")} className="transition hover:text-[#efd991] disabled:opacity-35">{fa ? "ورود با کد پیامکی" : "SMS login"}</button> : null}
              {mode !== "SIGNUP" ? <button type="button" disabled={!channelAvailability.smsEnabled} onClick={() => resetFlow("SIGNUP")} className="transition hover:text-[#efd991] disabled:opacity-35">{fa ? "عضویت با پیامک" : "Sign up with SMS"}</button> : null}
              {mode !== "RESET" ? <button type="button" disabled={!channelAvailability.smsEnabled} onClick={() => resetFlow("RESET")} className="transition hover:text-[#efd991] disabled:opacity-35">{fa ? "فراموشی رمز عبور" : "Forgot password"}</button> : null}
            </div>
          </>
        ) : (
          <form onSubmit={verifyCode} className="mt-8 space-y-4">
            <div className="rounded-2xl border border-[#d8b967]/10 bg-black/15 p-4"><p className="text-xs text-[#d8c59a]/55">{fa ? "کد به این شماره ارسال شد:" : "Code sent to this mobile number:"}</p><p dir="ltr" className="mt-2 text-sm text-[#efd991]">{mobile}</p></div>
            <label className="block text-xs text-[#d9c79e]/65">{fa ? "کد ۶ رقمی" : "6-digit code"}</label>
            <input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" required className="h-14 w-full rounded-2xl border border-[#d8b967]/14 bg-black/20 px-4 text-center font-mono text-xl tracking-[.35em] text-[#f1e5c9] outline-none focus:border-[#e2c779]/40" />
            {devCode ? <p className="rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3 text-xs text-amber-100/70">DEV OTP: {devCode}</p> : null}
            <button disabled={loading || code.length !== 6} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[#e3c873]/30 bg-[#143c2d] text-sm text-[#efd991] disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{mode === "OTP" ? (fa ? "ورود به حساب" : "Sign in") : mode === "SIGNUP" ? (fa ? "تکمیل عضویت" : "Complete sign-up") : (fa ? "تنظیم رمز جدید" : "Set new password")}</button>
            <button type="button" onClick={() => resetFlow(mode)} className="w-full py-2 text-xs text-[#c5b58f]/55">{fa ? "بازگشت و اصلاح اطلاعات" : "Go back and edit details"}</button>
          </form>
        )}

        {message ? <p className="mt-5 rounded-xl border border-[#d8b967]/10 bg-black/15 p-3 text-xs leading-6 text-[#ded0ad]/75">{message}</p> : null}
      </div>
    </section>
  );
}
