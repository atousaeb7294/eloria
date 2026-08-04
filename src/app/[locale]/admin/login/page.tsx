import type { Metadata } from "next";
import {
  Gem,
  ShieldCheck,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  AdminLoginForm,
} from "@/components/admin/admin-login-form";

import {
  hasValidAdminSession,
  isAdminConfigured,
  isAdminTotpRequired,
} from "@/lib/admin-auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

type AdminLoginPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminLoginPage({
  params,
}: AdminLoginPageProps) {
  const {
    locale,
  } = await params;

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  if (
    await hasValidAdminSession()
  ) {
    redirect(
      `/${locale}/admin`,
    );
  }

  const configured =
    isAdminConfigured();

  return (
    <main
      dir="rtl"
      className="relative grid min-h-screen place-items-center overflow-hidden bg-[#01110c] px-4 py-12 text-[#f5e7c5]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(197,161,64,0.14),transparent_38%),radial-gradient(circle_at_20%_80%,rgba(12,96,66,0.24),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:linear-gradient(30deg,#d8bd6a_12%,transparent_12.5%,transparent_87%,#d8bd6a_87.5%,#d8bd6a),linear-gradient(150deg,#d8bd6a_12%,transparent_12.5%,transparent_87%,#d8bd6a_87.5%,#d8bd6a)] [background-size:42px_74px]" />

      <section className="relative w-full max-w-md rounded-[30px] border border-[#d9bb65]/25 bg-[linear-gradient(145deg,rgba(5,39,28,0.96),rgba(1,18,13,0.98))] p-6 shadow-[0_34px_100px_rgba(0,0,0,0.5)] sm:p-9">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#e0c36e]/35 bg-[#d4b75f]/10 shadow-[inset_0_0_28px_rgba(218,188,101,0.08)]">
          <Gem className="h-8 w-8 text-[#e9cb75]" />
        </div>

        <p className="mt-5 text-center font-eloria-brand text-xs tracking-[0.4em] text-[#cdb46e]">
          ELORIA ADMIN
        </p>

        <h1 className="font-persian-title mt-2 text-center text-3xl leading-[1.9] text-[#fff0ca]">
          دروازه مدیریت الوریا
        </h1>

        <p className="mt-1 text-center text-sm leading-8 text-[#bdb092]">
          مدیریت محصولات، موجودی و سفارش‌ها در محیط محافظت‌شده فروشگاه
        </p>

        {!configured ? (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-950/20 px-4 py-4 text-sm leading-7 text-amber-100">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-5 w-5" />
              تنظیمات امنیتی ناقص است
            </div>
            متغیرهای
            <code className="mx-1 text-[#efd37e]">ELORIA_ADMIN_USERNAME</code>،
            <code className="mx-1 text-[#efd37e]">ELORIA_ADMIN_PASSWORD</code>
            و
            <code className="mx-1 text-[#efd37e]">ELORIA_ADMIN_SESSION_SECRET</code>
            را در فایل
            <code className="mx-1 text-[#efd37e]">.env</code>
            اضافه کنید.
          </div>
        ) : null}

        <AdminLoginForm
          locale={locale}
          totpRequired={isAdminTotpRequired()}
        />
      </section>
    </main>
  );
}
