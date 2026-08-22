import type { LucideIcon } from "lucide-react";
import {
  ArrowUp,
  BookOpen,
  CircleDot,
  Gem,
  Home,
  LayoutGrid,
  Mail,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { MeasurementPreferencesButton } from "@/components/measurement-preferences-button";

type SiteFooterProps = {
  locale: string;
};

type FooterLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type FooterColumn = {
  title: string;
  icon: LucideIcon;
  links: FooterLink[];
};

export function SiteFooter({ locale }: SiteFooterProps) {
  const isPersian = locale === "fa";

  const copy = isPersian
    ? {
        shopTitle: "فروشگاه",
        brandTitle: "الوریا",
        categoryTitle: "دسته‌بندی‌ها",
        products: "تمام آثار",
        collections: "مشاهده دسته‌بندی‌ها",
        cart: "سبد خرید",
        about: "داستان الوریا",
        journal: "مجلهٔ الوریا",
        home: "خانه",
        contact: "تماس با ما",
        necklaces: "گردنبندها",
        bracelets: "دستبندها",
        earrings: "گوشواره‌ها",
        rights: "تمام حقوق برای ELORIA محفوظ است.",
        top: "بازگشت به آغاز",
        signature: "جواهراتی با روایت ایران کهن",
      }
    : {
        shopTitle: "Shop",
        brandTitle: "Eloria",
        categoryTitle: "Categories",
        products: "All creations",
        collections: "Browse categories",
        cart: "Shopping cart",
        about: "The Eloria story",
        journal: "Eloria Journal",
        home: "Home",
        contact: "Contact us",
        necklaces: "Necklaces",
        bracelets: "Bracelets",
        earrings: "Earrings",
        rights: "All rights reserved for ELORIA.",
        top: "Back to the beginning",
        signature: "Jewellery shaped by ancient Persian stories",
      };

  const columns: FooterColumn[] = [
    {
      title: copy.shopTitle,
      icon: ShoppingBag,
      links: [
        {
          label: copy.products,
          href: `/${locale}/products`,
          icon: Sparkles,
        },
        {
          label: copy.collections,
          href: `/${locale}/collections`,
          icon: LayoutGrid,
        },
        {
          label: copy.cart,
          href: `/${locale}/cart`,
          icon: ShoppingCart,
        },
      ],
    },
    {
      title: copy.brandTitle,
      icon: Gem,
      links: [
        { label: copy.home, href: `/${locale}#hero`, icon: Home },
        {
          label: copy.about,
          href: `/${locale}/about`,
          icon: BookOpen,
        },
        {
          label: copy.journal,
          href: `/${locale}/journal`,
          icon: BookOpen,
        },
        {
          label: copy.contact,
          href: `/${locale}/contact`,
          icon: Mail,
        },
      ],
    },
    {
      title: copy.categoryTitle,
      icon: LayoutGrid,
      links: [
        {
          label: copy.necklaces,
          href: `/${locale}/collections/necklaces`,
          icon: Gem,
        },
        {
          label: copy.bracelets,
          href: `/${locale}/collections/bracelets`,
          icon: CircleDot,
        },
        {
          label: copy.earrings,
          href: `/${locale}/collections/earrings`,
          icon: Sparkles,
        },
      ],
    },
  ];

  return (
    <footer
      id="contact"
      className="relative z-10 scroll-mt-32 overflow-hidden border-t border-[#d8bb69]/16 bg-[#010b07] px-4 pb-7 pt-12 sm:px-6 lg:px-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(198,157,61,0.12),transparent_28%),linear-gradient(180deg,rgba(4,29,20,0.88),rgba(1,10,7,0.98))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(236,204,113,0.7),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-20 max-w-3xl opacity-25 [background-image:linear-gradient(135deg,transparent_46%,rgba(224,191,98,0.2)_47%,rgba(224,191,98,0.2)_53%,transparent_54%),linear-gradient(45deg,transparent_46%,rgba(224,191,98,0.16)_47%,rgba(224,191,98,0.16)_53%,transparent_54%)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          <div
            className="flex w-full max-w-xl items-center gap-4"
            aria-hidden="true"
          >
            <span className="h-px flex-1 bg-[linear-gradient(90deg,transparent,rgba(222,190,100,0.38))]" />
            <span className="relative grid size-11 place-items-center">
              <span className="absolute inset-1 rotate-45 border border-[#e2c36d]/28" />
              <Gem className="relative size-[17px] text-[#ead08a]" />
            </span>
            <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(222,190,100,0.38),transparent)]" />
          </div>

          <p className="mt-4 font-eloria-brand text-xl tracking-[0.34em] text-[#f0dc9e] sm:text-2xl">
            ELORIA
          </p>
          <p className="mt-2 text-xs leading-6 text-[#d2c4a5]/58">
            {copy.signature}
          </p>
        </div>

        <div className="mt-10 grid border-y border-[#ddc16d]/12 py-8 md:grid-cols-3 md:py-9">
          {columns.map((column, index) => {
            const ColumnIcon = column.icon;

            return (
              <nav
                key={column.title}
                aria-label={column.title}
                className={`px-2 py-7 first:pt-0 last:pb-0 md:px-9 md:py-0 ${
                  index > 0
                    ? "border-t border-[#ddc16d]/10 md:border-s md:border-t-0"
                    : ""
                }`}
              >
                <div className="mb-5 flex items-center gap-3">
                  <ColumnIcon
                    aria-hidden="true"
                    className="size-4 text-[#dfc16f]"
                  />
                  <h2 className="text-[13px] font-semibold tracking-wide text-[#f0ddb0]">
                    {column.title}
                  </h2>
                  <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(218,184,91,0.2),transparent)]" />
                </div>

                <div className="space-y-1">
                  {column.links.map((link) => {
                    const LinkIcon = link.icon;

                    return (
                      <Link
                        key={`${column.title}-${link.label}`}
                        href={link.href}
                        className="group flex min-h-10 items-center gap-3 rounded-lg px-1 text-sm text-[#d8cbb1]/66 transition-colors duration-300 hover:text-[#f0d58e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfc16f]/38"
                      >
                        <span className="grid size-6 shrink-0 place-items-center text-[#bfa964]/72 transition-colors duration-300 group-hover:text-[#efd386]">
                          <LinkIcon
                            aria-hidden="true"
                            className="size-[14px]"
                          />
                        </span>
                        <span className="relative">
                          {link.label}
                          <span
                            aria-hidden="true"
                            className="absolute inset-x-0 -bottom-1 h-px origin-right scale-x-0 bg-[linear-gradient(90deg,rgba(228,195,103,0.76),transparent)] transition-transform duration-300 group-hover:scale-x-100"
                          />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </nav>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-6 text-center text-xs text-[#c8b993]/52 sm:flex-row sm:text-start">
          <p>{copy.rights}</p>

          <div className="flex flex-wrap items-center justify-center gap-5 sm:justify-end">
            <MeasurementPreferencesButton locale={locale} />
            <Link
              href={`/${locale}#hero`}
              className="inline-flex min-h-9 items-center gap-2 text-[#d8c17c]/68 transition-colors duration-300 hover:text-[#f0d793] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfc16f]/38"
            >
              <ArrowUp aria-hidden="true" className="size-3.5" />
              {copy.top}
            </Link>
            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-[#d8ba62]/18 sm:block"
            />
            <p className="font-eloria-brand tracking-[0.2em] text-[#d6bf79]/58">
              ELORIA · 2026
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
