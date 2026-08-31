import Link from "next/link";
import { BookOpenText, MapPinned, Sparkles, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { generateProductMyth } from "@/lib/product-myth-generator";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminWorldPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();

  const products = await prisma.product.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
    select: {
      id: true,
      nameFa: true,
      nameEn: true,
      material: true,
      mythKey: true,
      mythNameFa: true,
      legendFa: true,
      status: true,
    },
  });

  const profiles = products.map(product => ({
    product,
    myth: generateProductMyth({
      nameFa: product.nameFa,
      nameEn: product.nameEn,
      material: product.material,
    }),
  }));

  return <div className="mx-auto max-w-[1540px] space-y-7">
    <section className="relative overflow-hidden rounded-[2rem] border border-[#d7b95f]/20 bg-[linear-gradient(135deg,rgba(10,56,40,.95),rgba(3,24,17,.98))] px-6 py-7 sm:px-8">
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3 text-[#e7c86f]"><BookOpenText className="size-6" /><p className="text-[10px] uppercase tracking-[.28em]">Eloria World Studio</p></div>
          <h1 className="mt-5 text-2xl font-semibold text-[#f5e8c9] sm:text-3xl">استودیوی جهان و افسانه‌های الوریا</h1>
          <p className="mt-3 max-w-4xl text-sm leading-8 text-[#d8c9aa]/72">مرجع یکپارچهٔ شخصیت هر اثر، خاستگاه، دوره و پیوند آن با «شب دروازه‌های بسته». همهٔ شخصیت‌ها و پوشش‌ها ایرانی‌اند و هر روایت مستقل، یک سرنخ به افسانهٔ مادر دارد.</p>
        </div>
        <Link href={`/${locale}/about#mother-legend`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#e2c56f]/30 px-4 py-2.5 text-xs text-[#ecd38b]">مشاهده افسانهٔ مادر در سایت</Link>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#d7b95f]/16 bg-[#061c15]/86 p-5"><Sparkles className="size-5 text-[#e4c673]" /><strong className="mt-4 block text-2xl text-[#f0db9b]">{new Intl.NumberFormat("fa-IR").format(profiles.length)}</strong><span className="text-xs text-[#c5b694]/55">نشان ثبت‌شده در بایگانی</span></div>
      <div className="rounded-2xl border border-[#d7b95f]/16 bg-[#061c15]/86 p-5"><UserRound className="size-5 text-[#e4c673]" /><strong className="mt-4 block text-2xl text-[#f0db9b]">{new Intl.NumberFormat("fa-IR").format(new Set(profiles.map(item => item.myth.worldProfile.characterNameFa)).size)}</strong><span className="text-xs text-[#c5b694]/55">شخصیت یکتا</span></div>
      <div className="rounded-2xl border border-[#d7b95f]/16 bg-[#061c15]/86 p-5"><MapPinned className="size-5 text-[#e4c673]" /><strong className="mt-4 block text-2xl text-[#f0db9b]">{new Intl.NumberFormat("fa-IR").format(new Set(profiles.map(item => item.myth.worldProfile.homelandFa)).size)}</strong><span className="text-xs text-[#c5b694]/55">خاستگاه در نقشهٔ الوریا</span></div>
    </section>

    <section className="grid gap-4 xl:grid-cols-2">
      {profiles.map(({ product, myth }) => {
        const profile = myth.worldProfile;
        return <article key={product.id} className="rounded-[1.8rem] border border-[#d7b95f]/17 bg-[#061c15]/86 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] text-[#d9bd73]/60">{product.status} · {product.mythKey ?? myth.mythKey}</p><h2 className="mt-2 text-lg text-[#f2e2bd]">{product.nameFa} — {product.mythNameFa ?? myth.mythNameFa}</h2></div><Link href={`/${locale}/admin/products/${product.id}`} className="rounded-full border border-[#d7b95f]/20 px-3 py-2 text-[11px] text-[#e8cf82]">ویرایش اثر</Link></div>
          <p className="mt-4 text-sm leading-8 text-[#d5c6a6]/67">{product.legendFa?.trim() || myth.legendFa}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <p className="rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs leading-6 text-[#c8ba99]/62"><span className="block text-[9px] text-[#d9bd73]/60">شخصیت</span>{profile.characterNameFa}؛ {profile.roleFa}</p>
            <p className="rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs leading-6 text-[#c8ba99]/62"><span className="block text-[9px] text-[#d9bd73]/60">مکان و دوره</span>{profile.homelandFa}؛ {profile.eraFa}</p>
          </div>
          <details className="mt-4 rounded-xl border border-[#d7b95f]/10 p-3"><summary className="cursor-pointer text-xs text-[#e3ca7d]">دستور آمادهٔ ساخت تصویر ایرانی این شخصیت</summary><p className="mt-3 text-xs leading-7 text-[#c8ba99]/60">{profile.visualPromptFa}</p></details>
        </article>;
      })}
      {!profiles.length ? <p className="rounded-2xl border border-[#d7b95f]/15 bg-[#061c15]/80 p-6 text-sm text-[#c8ba99]/60">با ساخت اولین محصول، شخصیت و افسانهٔ مستقل آن در اینجا ظاهر می‌شود.</p> : null}
    </section>
  </div>;
}
