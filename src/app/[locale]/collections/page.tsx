import { TreasuryLink } from "@/components/treasury-transition";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { InteractiveTiltCard } from "@/components/interactive-tilt-card";
import { InternalPageShell } from "@/components/internal-page-shell";
import { AllProductsRuneIcon, GoldRuneIcon, SilverRuneIcon } from "@/components/material-rune-icons";

export const revalidate = 300;

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  setRequestLocale(locale);
  const fa = locale === "fa";
  const treasuries = [
    { slug: "gold", href: `/${locale}/collections/gold`, name: fa ? "گنجینهٔ طلا" : "Gold Treasury", description: fa ? "گرمای طلا، در بافت و نقش الوریا." : "Gold, woven into the forms of Eloria.", image: "/images/treasuries/gold.webp", Icon: GoldRuneIcon },
    { slug: "silver", href: `/${locale}/collections/silver`, name: fa ? "گنجینهٔ نقره" : "Silver Treasury", description: fa ? "روشنی نقره، آرام و ماندگار." : "Silver with a quiet, lasting light.", image: "/images/treasuries/silver.webp", Icon: SilverRuneIcon },
    { slug: "weave", href: `/${locale}/collections/weave`, name: fa ? "گنجینهٔ بافت" : "Woven Treasury", description: fa ? "نخ و گره؛ بی‌حضور طلا و نقره." : "Thread and knot, without gold or silver.", image: "/images/treasuries/weave.webp", Icon: AllProductsRuneIcon },
  ];

  return (
    <InternalPageShell locale={locale}>
      <section className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-28 pt-36 sm:px-6 lg:px-10 lg:pt-40">
        <header className="mx-auto max-w-4xl text-center">
          <p className="text-[10px] uppercase tracking-[0.45em] text-[#cfb66f]/65 sm:text-xs">Eloria Treasuries</p>
          <h1 className={fa ? "font-persian-title mt-4 pb-5 text-4xl leading-[1.8] text-[#f6e8c6] sm:text-5xl lg:text-6xl" : "mt-4 text-4xl font-semibold text-[#f6e8c6] sm:text-5xl lg:text-6xl"}>{fa ? "سه گنجینهٔ الوریا" : "The Three Eloria Treasuries"}</h1>
          <p className="mx-auto max-w-2xl text-sm leading-8 text-[#cbbd9d]/72">{fa ? "سه مسیر؛ سه حال‌وهوای متفاوت." : "Three paths, each with its own character."}</p>
          <Link href={`/${locale}/products`} className="mx-auto mt-6 inline-flex items-center gap-3 rounded-full border border-[#d9b85f]/35 bg-[#061f17]/75 px-5 py-3 text-xs text-[#e8d39a] transition hover:border-[#efd17d]/68">{fa ? "مشاهده و فیلتر تمام آثار" : "Browse and filter all creations"}<AllProductsRuneIcon className="size-5" /></Link>
        </header>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {treasuries.map(({ slug, href, name, description, image, Icon }) => (
            <InteractiveTiltCard key={slug} maxTilt={3} lift={5} className="group rounded-[2.2rem]">
              <TreasuryLink href={href} className="block overflow-hidden rounded-[2.2rem] border border-[#d8b860]/20 bg-[#041b14] p-3 transition duration-500 hover:border-[#e8cc78]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e8cc78]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem]">
                  <Image src={image} alt={name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-1000 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#01120c]/95 via-transparent to-black/10" />
                  <div className="absolute inset-x-0 bottom-6 flex justify-center"><span className="grid size-16 place-items-center rounded-full border border-[#efd17a]/40 bg-[#052218]/88 text-[#e3c574] backdrop-blur-md"><Icon className="size-8" /></span></div>
                </div>
                <div className="px-3 pb-4 pt-6 text-center"><h2 className={fa ? "font-persian-title text-3xl text-[#f4e8cc]" : "text-2xl font-medium text-[#f4e8cc]"}>{name}</h2><p className="mt-3 text-sm leading-7 text-[#cbbd9d]/72">{description}</p><span className="mt-5 inline-block border-b border-[#d9b85f]/35 pb-1 text-xs text-[#ead18a]">{fa ? "ورود به گنجینه" : "Enter treasury"}</span></div>
              </TreasuryLink>
            </InteractiveTiltCard>
          ))}
        </div>
      </section>
    </InternalPageShell>
  );
}
