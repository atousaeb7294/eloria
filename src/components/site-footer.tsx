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
      className="relative z-10 scroll-mt-32 overflow-hidden border-t border-[#d9bd70]/18 bg-[#010c08] px-4 pb-8 pt-14 sm:px-6 lg:px-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_18%_0%,rgba(193,151,61,0.13),transparent_31%),radial-gradient(circle_at_82%_18%,rgba(25,106,73,0.16),transparent_34%),linear-gradient(180deg,rgba(5,34,23,0.72),rgba(1,10,7,0.97))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(232,202,117,0.62),transparent)]"
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <div className="grid size-12 place-items-center rounded-full border border-[#e4c56f]/30 bg-[#d7b55d]/8 shadow-[0_0_40px_rgba(205,166,76,0.12)]">
            <Gem aria-hidden="true" className="size-5 text-[#ead18b]" />
          </div>

          <div>
            <p className="font-eloria-brand text-lg tracking-[0.3em] text-[#eed99f] sm:text-xl">
              ELORIA
            </p>
            <p className="mt-2 text-xs leading-6 text-[#d3c5a7]/62">
              {copy.signature}
            </p>
          </div>

          <div
            aria-hidden="true"
            className="flex w-full max-w-sm items-center gap-3"
          >
            <span className="h-px flex-1 bg-[linear-gradient(90deg,transparent,rgba(220,188,103,0.3))]" />
            <span className="size-1.5 rotate-45 border border-[#dfc36f]/55" />
            <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(220,188,103,0.3),transparent)]" />
          </div>
        </div>

        <div className="grid gap-4 border-b border-[#dfc572]/14 pb-10 md:grid-cols-3 md:gap-5">
          {columns.map((column) => {
            const ColumnIcon = column.icon;

            return (
              <nav
                key={column.title}
                aria-label={column.title}
                className="relative overflow-hidden rounded-[22px] border border-[#d9bc6d]/14 bg-[linear-gradient(145deg,rgba(13,53,38,0.52),rgba(2,19,13,0.7))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_18px_55px_rgba(0,0,0,0.17)] sm:p-6"
              >
                <span
                  aria-hidden="true"
                  className="absolute end-0 top-0 size-20 rounded-bl-[70px] border-b border-s border-[#dabb67]/10 bg-[#cfaa4e]/[0.025]"
                />

                <div className="relative flex items-center gap-3 border-b border-[#dfc572]/10 pb-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#e0c16c]/20 bg-[#d8b65d]/8 text-[#e7ca7b]">
                    <ColumnIcon aria-hidden="true" className="size-[17px]" />
                  </span>
                  <h2 className="text-sm font-semibold text-[#f0ddad]">
                    {column.title}
                  </h2>
                </div>

                <div className="relative mt-3 space-y-1.5">
                  {column.links.map((link) => {
                    const LinkIcon = link.icon;

                    return (
                      <Link
                        key={`${column.title}-${link.label}`}
                        href={link.href}
                        className="group flex min-h-11 items-center gap-3 rounded-xl border border-transparent px-3 text-sm text-[#ddd1b8]/70 transition-[border-color,background-color,color] duration-300 hover:border-[#dfc16f]/16 hover:bg-[#d9b65a]/[0.055] hover:text-[#f5dda0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfc16f]/45"
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-[#ddbf6b]/12 bg-[#d8b55d]/[0.035] text-[#cdb671]/72 transition-colors duration-300 group-hover:border-[#e1c46f]/24 group-hover:text-[#efd68e]">
                          <LinkIcon
                            aria-hidden="true"
                            className="size-[14px]"
                          />
                        </span>
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </nav>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-between gap-5 pt-6 text-center text-xs text-[#c8b992]/58 sm:flex-row sm:text-start">
          <p>{copy.rights}</p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
            <Link
              href={`/${locale}#hero`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#dfc16f]/16 bg-[#d9b65a]/[0.035] px-4 text-[#dfc77f]/76 transition-[border-color,background-color,color] duration-300 hover:border-[#dfc16f]/30 hover:bg-[#d9b65a]/[0.07] hover:text-[#f1d999] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfc16f]/45"
            >
              <ArrowUp aria-hidden="true" className="size-3.5" />
              {copy.top}
            </Link>
            <p className="font-eloria-brand tracking-[0.2em] text-[#d8c17d]/65">
              ELORIA · 2026
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
