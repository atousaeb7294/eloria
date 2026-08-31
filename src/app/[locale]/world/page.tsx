import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenText, MapPinned, Sparkles, UserRound } from "lucide-react";

import { InternalPageShell } from "@/components/internal-page-shell";
import { generateProductMyth } from "@/lib/product-myth-generator";
import { prisma, withDatabaseRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EloriaWorldPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  const fa = locale === "fa";

  const products = await withDatabaseRetry(() => prisma.product.findMany({
    where: { status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, mythKey: { not: null } },
    orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true, slug: true, nameFa: true, nameEn: true, material: true,
      mythKey: true, mythNameFa: true, mythNameEn: true, legendFa: true, legendEn: true,
      images: { orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }], take: 1,
        select: { imageUrl: true, altFa: true, altEn: true } },
    },
  }));

  return <InternalPageShell locale={locale}>
    <main dir={fa ? "rtl" : "ltr"} className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-28 pt-[132px] sm:px-6 lg:px-10">
      <header className="mx-auto max-w-4xl text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full border border-[#dfc36d]/35 bg-[#d5b85e]/10 text-[#e8cc78]"><Sparkles className="size-7" /></div>
        <p className="mt-6 text-[9px] uppercase tracking-[.44em] text-[#cfb66f]/65">The Living World of Eloria</p>
        <h1 className={`${fa ? "font-persian-title leading-[1.9]" : "font-semibold"} mt-3 text-4xl text-[#f5e6c3] sm:text-6xl`}>
          {fa ? "الوریا؛ سرزمین افسانه‌ها" : "Eloria, the Land of Legends"}
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-sm leading-9 text-[#d5c7a7]/72">
          {fa ? "هر نشان، یادگار یک انسان و یک واقعه است. با کنار هم آمدن آثار، چهره‌ها، شهرها و بخش‌های گمشدهٔ نقشهٔ الوریا دوباره آشکار می‌شوند." : "Every Sign remembers one person and one event. As the creations return, Eloria's faces, cities and lost map emerge again."}
        </p>
        <Link href={`/${locale}/about#mother-legend`} className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#dfc36d]/30 bg-[#d5b85e]/[.06] px-5 py-3 text-xs text-[#ead38a]"><BookOpenText className="size-4" />{fa ? "خواندن افسانهٔ مادر" : "Read the mother legend"}</Link>
      </header>

      <section className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.map(product => {
          const myth = generateProductMyth({ nameFa: product.nameFa, nameEn: product.nameEn, material: product.material });
          const profile = myth.worldProfile;
          const image = product.images[0];
          return <article key={product.id} className="group overflow-hidden rounded-[2rem] border border-[#d8ba64]/18 bg-[#061c15]/88 shadow-[0_28px_75px_rgba(0,0,0,.32)]">
            <Link href={`/${locale}/products/${product.slug}`} className="block">
              <div className="relative aspect-[4/3] overflow-hidden bg-[#03130e]">
                {image ? <Image src={image.imageUrl} alt={(fa ? image.altFa : image.altEn) || (fa ? product.nameFa : product.nameEn)} fill sizes="(max-width:768px) 100vw,(max-width:1280px) 50vw,33vw" className="object-cover transition duration-700 group-hover:scale-[1.035]" /> : <div className="grid h-full place-items-center text-[#d8bb6a]/28"><Sparkles className="size-10" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-[#03130e] via-transparent to-transparent" />
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-[10px] text-[#d8bb70]/58">{fa ? product.mythNameFa : product.mythNameEn}</p>
                <h2 className="mt-2 text-xl text-[#f1e0b9]">{fa ? product.nameFa : product.nameEn}</h2>
                <p className="mt-4 text-sm leading-8 text-[#d0c09f]/68">{(fa ? product.legendFa : product.legendEn) || (fa ? myth.legendFa : myth.legendEn)}</p>
                <div className="mt-5 grid gap-2 text-[11px] text-[#c8b995]/58 sm:grid-cols-2">
                  <span className="flex items-center gap-2 rounded-xl border border-white/[.05] p-3"><UserRound className="size-4 text-[#ddc16e]" />{fa ? profile.characterNameFa : profile.characterNameEn}</span>
                  <span className="flex items-center gap-2 rounded-xl border border-white/[.05] p-3"><MapPinned className="size-4 text-[#ddc16e]" />{fa ? profile.homelandFa : profile.homelandEn}</span>
                </div>
              </div>
            </Link>
          </article>;
        })}
      </section>
      {!products.length ? <p className="mt-14 rounded-3xl border border-[#d8ba64]/15 bg-[#061c15]/80 p-8 text-center text-sm text-[#c8b995]/65">{fa ? "با انتشار نخستین اثر، نخستین شخصیت این جهان در اینجا پدیدار می‌شود." : "The first character will appear here when the first creation is published."}</p> : null}
    </main>
  </InternalPageShell>;
}
