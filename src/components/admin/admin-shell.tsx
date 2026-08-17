import type {
  ReactNode,
} from "react";

import Link from "next/link";

import {
  Boxes,
  Gem,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  ShoppingBag,
  ShieldAlert,
  Store,
} from "lucide-react";

import {
  adminLogoutAction,
} from "@/app/[locale]/admin/(protected)/actions";

const navigation = [
  {
    href: "",
    label: "داشبورد",
    icon: LayoutDashboard,
  },
  {
    href: "/products",
    label: "محصولات و موجودی",
    icon: Boxes,
  },
  {
    href: "/orders",
    label: "سفارش‌ها",
    icon: ShoppingBag,
  },
  {
    href: "/security",
    label: "امنیت و هشدارها",
    icon: ShieldAlert,
  },
];

export function AdminShell({
  children,
  locale,
}: {
  children: ReactNode;
  locale: "fa" | "en";
}) {
  const basePath =
    `/${locale}/admin`;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#01110c] text-[#f6e8c6]"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(194,157,58,0.09),transparent_32%),radial-gradient(circle_at_10%_75%,rgba(8,101,69,0.18),transparent_34%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1800px]">
        <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 border-l border-[#d5b75f]/15 bg-[#021811]/92 p-5 backdrop-blur-xl lg:flex lg:flex-col">
          <Link
            href={`/${locale}#hero`}
            className="flex items-center gap-3 rounded-2xl border border-[#d3b45c]/20 bg-[#061f17] px-4 py-4"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full border border-[#e0c36d]/30 bg-[#d6b95f]/10">
              <Gem className="h-6 w-6 text-[#e7c86f]" />
            </span>

            <span>
              <span className="block font-eloria-brand text-sm tracking-[0.22em] text-[#ecd17d]">
                ELORIA
              </span>
              <span className="mt-1 block text-xs text-[#a99b7d]">
                پنل مدیریت
              </span>
            </span>
          </Link>

          <nav className="mt-8 space-y-2">
            {navigation.map(
              ({
                href,
                label,
                icon: Icon,
              }) => (
                <Link
                  key={href}
                  href={`${basePath}${href}`}
                  className="flex items-center gap-3 rounded-xl border border-transparent px-4 py-3.5 text-sm text-[#cabd9f] transition hover:border-[#d2b55e]/20 hover:bg-[#d1b35b]/8 hover:text-[#f2d989]"
                >
                  <Icon className="h-5 w-5 text-[#c7aa55]" />
                  {label}
                </Link>
              ),
            )}
          </nav>

          <div className="mt-auto space-y-2 border-t border-[#d5b75f]/12 pt-5">
            <Link
              href={`/${locale}/products`}
              target="_blank"
                            rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#a99d82] transition hover:bg-white/5 hover:text-[#ead07e]"
            >
              <Store className="h-5 w-5" />
              مشاهده فروشگاه
            </Link>

            <form action={adminLogoutAction}>
              <input
                type="hidden"
                name="locale"
                value={locale}
              />
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-200/75 transition hover:bg-red-950/20 hover:text-red-100"
              >
                <LogOut className="h-5 w-5" />
                خروج امن
              </button>
            </form>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between border-b border-[#d7b95f]/14 bg-[#01130d]/88 px-4 backdrop-blur-xl sm:px-6 lg:px-9">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-[#c3a955]/70">
                Eloria Operations
              </p>
              <p className="mt-1 text-sm text-[#d9c8a4]">
                مدیریت فروشگاه و عملیات روزانه
              </p>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <Link
                href={basePath}
                aria-label="داشبورد"
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#d1b45c]/20 bg-[#08241a] text-[#ddc36f]"
              >
                <LayoutDashboard className="h-5 w-5" />
              </Link>
              <Link
                href={`${basePath}/products`}
                aria-label="محصولات"
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#d1b45c]/20 bg-[#08241a] text-[#ddc36f]"
              >
                <PackageSearch className="h-5 w-5" />
              </Link>
              <Link
                href={`${basePath}/orders`}
                aria-label="سفارش‌ها"
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#d1b45c]/20 bg-[#08241a] text-[#ddc36f]"
              >
                <ShoppingBag className="h-5 w-5" />
              </Link>
              <Link
                href={`${basePath}/security`}
                aria-label="امنیت و هشدارها"
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#d1b45c]/20 bg-[#08241a] text-[#ddc36f]"
              >
                <ShieldAlert className="h-5 w-5" />
              </Link>
              <form action={adminLogoutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  aria-label="خروج امن"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-red-300/15 bg-red-950/15 text-red-200/75"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </div>
          </header>

          <div className="px-4 py-7 sm:px-6 lg:px-9 lg:py-9">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
