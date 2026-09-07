import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { BookOpenText, MapPinned, Sparkles, UserRound } from "lucide-react";

import { InternalPageShell } from "@/components/internal-page-shell";
import { ELORIA_GUARDIANS } from "@/lib/eloria-mythology";
import {
  generateProductMyth,
  getProductMythByKey,
} from "@/lib/product-myth-generator";
import { prisma, withDatabaseRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const fa = locale !== "en";
  return {
    title: fa
      ? "آتلیه الوریا | هفت نگهبان، شخصیت‌ها و افسانه‌های پنهان"
      : "Eloria Atelier | Seven Guardians, Characters and Hidden Legends",
    description: fa
      ? "در آتلیهٔ الوریا، هفت نگهبان، قلمرو هر شخصیت و افسانهٔ پنهان یکتای محصولات را ببینید؛ هر اثر به دنیای اصلی الوریا پیوند دارد."
      : "Meet Eloria’s Seven Guardians, their realms and each product’s unique hidden legend in the connected Eloria Atelier.",
    alternates: {
      canonical: `/${locale}/atelier`,
      languages: { fa: "/fa/atelier", en: "/en/atelier", "x-default": "/fa/atelier" },
    },
  };
}

export default async function AtelierPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  setRequestLocale(locale);
  const fa = locale === "fa";

  const products = await withDatabaseRetry(() =>
    prisma.product.findMany({
      where: {
        status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
        mythKey: { not: null },
      },
      orderBy: [
        { isFeatured: "desc" },
        { displayOrder: "asc" },
        { updatedAt: "desc" },
      ],
      take: 154,
      select: {
        id: true,
        slug: true,
        nameFa: true,
        nameEn: true,
        material: true,
        mythKey: true,
        mythNameFa: true,
        mythNameEn: true,
        legendFa: true,
        legendEn: true,
        characterImageUrl: true,
        worldSceneImageUrl: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
          take: 1,
          select: { imageUrl: true, altFa: true, altEn: true },
        },
      },
    }),
  ).catch((error) => {
    // The public atelier stays available when a local preview has no database access.
    console.error("[Eloria Atelier] Product legends are temporarily unavailable.", error);
    return [];
  });

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: fa ? "آتلیهٔ الوریا" : "Eloria Atelier",
    url: `https://eloriagallery.ir/${locale}/atelier`,
    description: fa
      ? "آتلیهٔ شخصیت‌ها، نگهبانان و افسانه‌های پنهان محصولات الوریا."
      : "The atelier of Eloria’s characters, Guardians and hidden product legends.",
  };

  return (
    <InternalPageShell locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main
        dir={fa ? "rtl" : "ltr"}
        className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-28 pt-[132px] sm:px-6 sm:pt-[144px] lg:px-10"
      >
        <header className="mx-auto max-w-4xl text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full border border-[#dfc36d]/35 bg-[#d5b85e]/10 text-[#e8cc78]">
            <Sparkles className="size-7" />
          </div>
          <p className="mt-6 text-[9px] uppercase tracking-[.44em] text-[#cfb66f]/65">Eloria Atelier</p>
          <h1 className={`${fa ? "font-persian-title leading-[1.9]" : "font-semibold"} mt-3 text-4xl text-[#f5e6c3] sm:text-6xl`}>
            {fa ? "آتلیهٔ الوریا" : "The Eloria Atelier"}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-9 text-[#d5c7a7]/72">
            {fa
              ? "محیط شخصیت‌ها، هفت نگهبان و افسانه‌های پنهان هر اثر در اینجا به هم متصل می‌شوند. برای هر محصول، مدیر می‌تواند تصویر شخصیت و تصویر فضای آن را از پنل مدیریت انتخاب کند."
              : "The characters’ settings, Seven Guardians and hidden legends meet here. For every product, an administrator can choose the character and scene image in the dashboard."}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href={`/${locale}/story#mother-legend`} className="inline-flex items-center gap-2 rounded-full border border-[#dfc36d]/30 bg-[#d5b85e]/[.06] px-5 py-3 text-xs text-[#ead38a]">
              <BookOpenText className="size-4" />
              {fa ? "خواندن افسانهٔ مادر" : "Read the mother legend"}
            </Link>
            <Link href={`/${locale}/about`} className="rounded-full border border-white/[.10] px-5 py-3 text-xs text-white/65 transition hover:border-[#dfc36d]/35 hover:text-[#ead38a]">
              {fa ? "دربارهٔ رسمی الوریا" : "About Eloria"}
            </Link>
          </div>
        </header>

        <section className="mt-14" aria-labelledby="guardians-title">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[.42em] text-[#cfb66f]/60">The Seven Guardians</p>
              <h2 id="guardians-title" className={`${fa ? "font-persian-title leading-[1.9]" : "font-semibold"} mt-2 text-3xl text-[#f5e6c3] sm:text-4xl`}>
                {fa ? "محیط هفت نگهبان" : "The Seven Guardians’ settings"}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-8 text-[#d5c7a7]/62">
              {fa ? "هر نگهبان یک قلمرو، نشانه و نقش مشخص دارد؛ تمام شخصیت‌های محصولات زیرمجموعهٔ یکی از این هفت جهان‌اند." : "Every Guardian has a realm, symbol and role; every product character belongs to one of these seven worlds."}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {ELORIA_GUARDIANS.map((guardian) => (
              <article id={`guardian-${guardian.id}`} key={guardian.id} className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-[#d8ba64]/18 bg-[#061c15]/88 shadow-[0_28px_75px_rgba(0,0,0,.32)]">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={guardian.imageUrl}
                    alt={fa ? `پرترهٔ ${guardian.nameFa}، ${guardian.titleFa}` : `Portrait of ${guardian.nameEn}, ${guardian.titleEn}`}
                    fill
                    sizes="(max-width:640px) 50vw,(max-width:1280px) 25vw,300px"
                    className="object-cover"
                    priority={guardian.id === "yalda"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#03130e] via-transparent to-transparent" />
                  <p className="absolute bottom-4 start-4 rounded-full border border-white/15 bg-[#04150f]/75 px-3 py-1.5 text-[10px] text-[#f0ddab] backdrop-blur-sm">
                    {fa ? guardian.realmFa : guardian.realmEn}
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-[10px] text-[#d8bb70]/58">{fa ? guardian.titleFa : guardian.titleEn}</p>
                  <h3 className="mt-1 text-xl text-[#f1e0b9]">{fa ? guardian.nameFa : guardian.nameEn}</h3>
                  <p className="mt-3 text-xs leading-7 text-[#d0c09f]/66">{fa ? guardian.summaryFa : guardian.summaryEn}</p>
                  <p className="mt-3 border-s border-[#dfc36d]/28 ps-3 text-[11px] leading-6 text-[#e4cf93]/72">{fa ? guardian.vowFa : guardian.vowEn}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="hidden-legends" className="mt-16 scroll-mt-28" aria-labelledby="legends-title">
          <div className="mb-6">
            <p className="text-[9px] uppercase tracking-[.42em] text-[#cfb66f]/60">Hidden Legends Archive</p>
            <h2 id="legends-title" className={`${fa ? "font-persian-title leading-[1.9]" : "font-semibold"} mt-2 text-3xl text-[#f5e6c3] sm:text-4xl`}>
              {fa ? "افسانه‌های پنهان و شخصیت‌های آثار" : "Hidden legends and product characters"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[#d5c7a7]/65">
              {fa ? "هر افسانه یک‌بار و فقط برای یک محصول ثبت می‌شود؛ نام شخصیت، نگهبان، خاستگاه و تصویرهای انتخاب‌شدهٔ آن نیز در همین مسیر قابل پیگیری است." : "Every legend is stored once and only for one product; its character, Guardian, homeland and selected images remain traceable here."}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const myth =
                (product.mythKey
                  ? getProductMythByKey(product.mythKey, {
                      nameFa: product.nameFa,
                      nameEn: product.nameEn,
                      material: product.material,
                    })
                  : null) ??
                generateProductMyth({
                  nameFa: product.nameFa,
                  nameEn: product.nameEn,
                  material: product.material,
                });
              const profile = myth.worldProfile;
              const imageUrl = product.worldSceneImageUrl || product.characterImageUrl || product.images[0]?.imageUrl;
              const imageAlt = product.images[0] ? (fa ? product.images[0].altFa : product.images[0].altEn) : null;
              return (
                <article key={product.id} className="group overflow-hidden rounded-[2rem] border border-[#d8ba64]/18 bg-[#061c15]/88 shadow-[0_28px_75px_rgba(0,0,0,.32)]">
                  <Link href={`/${locale}/products/${product.slug}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#03130e]">
                      {imageUrl ? (
                        <Image src={imageUrl} alt={imageAlt || (fa ? product.nameFa : product.nameEn)} fill sizes="(max-width:768px) 100vw,(max-width:1280px) 50vw,33vw" className="object-cover transition duration-700 group-hover:scale-[1.035]" />
                      ) : (
                        <div className="grid h-full place-items-center text-[#d8bb6a]/28"><MapPinned className="size-10" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#03130e] via-transparent to-transparent" />
                    </div>
                    <div className="p-5 sm:p-6">
                      <p className="text-[10px] text-[#d8bb70]/58">{fa ? product.mythNameFa || myth.mythNameFa : product.mythNameEn || myth.mythNameEn}</p>
                      <h3 className="mt-2 text-xl text-[#f1e0b9]">{fa ? product.nameFa : product.nameEn}</h3>
                      <p className="mt-4 text-sm leading-8 text-[#d0c09f]/68">{(fa ? product.legendFa : product.legendEn)?.trim() || (fa ? myth.legendFa : myth.legendEn)}</p>
                      <div className="mt-5 grid gap-2 text-[11px] text-[#c8b995]/58 sm:grid-cols-2">
                        <span className="flex items-center gap-2 rounded-xl border border-white/[.05] p-3"><UserRound className="size-4 text-[#ddc16e]" />{fa ? `${profile.guardianNameFa} · ${profile.characterNameFa}` : `${profile.guardianNameEn} · ${profile.characterNameEn}`}</span>
                        <span className="flex items-center gap-2 rounded-xl border border-white/[.05] p-3"><MapPinned className="size-4 text-[#ddc16e]" />{fa ? profile.homelandFa : profile.homelandEn}</span>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
          {!products.length ? (
            <p className="mt-6 rounded-3xl border border-[#d8ba64]/15 bg-[#061c15]/80 p-8 text-center text-sm text-[#c8b995]/65">
              {fa ? "با انتشار نخستین اثر، افسانهٔ پنهان، شخصیت و فضای آن در اینجا پدیدار می‌شود." : "The first hidden legend, character and setting will appear here when the first creation is published."}
            </p>
          ) : null}
        </section>
      </main>
    </InternalPageShell>
  );
}
