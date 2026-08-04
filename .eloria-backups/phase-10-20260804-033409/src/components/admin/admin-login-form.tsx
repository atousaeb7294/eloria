"use client";

import {
  useActionState,
} from "react";

import {
  LockKeyhole,
  LogIn,
} from "lucide-react";

import {
  adminLoginAction,
  type AdminLoginState,
} from "@/app/[locale]/admin/login/actions";

const initialState: AdminLoginState = {
  error: null,
};

export function AdminLoginForm({
  locale,
}: {
  locale: "fa" | "en";
}) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    adminLoginAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="mt-8 space-y-5"
    >
      <input
        type="hidden"
        name="locale"
        value={locale}
      />

      <label className="block">
        <span className="mb-2 block text-sm text-[#d7c9a8]">
          رمز مدیریت
        </span>

        <span className="relative block">
          <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#d7bb69]" />

          <input
            autoComplete="current-password"
            autoFocus
            required
            minLength={12}
            name="password"
            type="password"
            placeholder="رمز امن مدیریت را وارد کنید"
            className="h-14 w-full rounded-2xl border border-[#cfb45f]/25 bg-[#02150f]/86 pr-12 pl-4 text-sm text-[#fff0ca] outline-none transition placeholder:text-[#8f846b]/65 focus:border-[#e3c56f]/65 focus:ring-4 focus:ring-[#d7b85e]/10"
          />
        </span>
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300/20 bg-red-950/25 px-4 py-3 text-sm leading-7 text-red-100"
        >
          {state.error}
        </p>
      ) : null}

      <button
        disabled={isPending}
        type="submit"
        className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#e0c36d]/40 bg-[linear-gradient(135deg,#c6a950,#f0d47f,#aa8738)] px-5 text-sm font-semibold text-[#10261d] shadow-[0_18px_50px_rgba(187,150,55,0.18)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
      >
        <LogIn className="h-5 w-5" />

        {isPending
          ? "در حال بررسی…"
          : "ورود به پنل الوریا"}
      </button>
    </form>
  );
}
