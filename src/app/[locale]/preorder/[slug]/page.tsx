import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { InternalPageShell } from "@/components/internal-page-shell";
import { ProductPreorderForm } from "@/components/product-preorder-form";
import { isPreorderAvailable } from "@/lib/product-preorder";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: true } };
export default async function PreorderPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ variant?: string }> }) {
  const { locale, slug } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  setRequestLocale(locale);
  const product = await prisma.product.findFirst({ where: { slug, status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, collection: { isActive: true } }, select: { nameFa: true, nameEn: true, stock: true, status: true, collection: { select: { isActive: true } }, variants: { where: { isActive: true }, select: { id: true, stock: true, titleFa: true, titleEn: true, isActive: true } } } });
  if (!product) notFound();
  const requestedVariant = (await searchParams).variant;
  const variant = requestedVariant ? product.variants.find(v => v.id === requestedVariant) : null;
  if (requestedVariant && !variant) notFound();
  const fa = locale === "fa";
  return <InternalPageShell locale={locale}><section className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-36 text-[#f6e8c6]">
    <Link href={`/${locale}/products/${slug}`} className="text-sm text-[#d9b85f]">{fa ? "بازگشت به محصول" : "Back to product"}</Link>
    <h1 className="mt-6 text-3xl leading-relaxed">{fa ? "پیش‌سفارش" : "Preorder"} {fa ? product.nameFa : product.nameEn}</h1>
    {variant && <p className="mt-3">{fa ? variant.titleFa : variant.titleEn}</p>}
    {isPreorderAvailable(product, variant) ? <ProductPreorderForm locale={locale} slug={slug} variantId={variant?.id ?? null} /> : <p className="mt-6 leading-8">{fa ? "این محصول اکنون موجود است؛ برای خرید به صفحهٔ محصول برگردید." : "This item is available now. Return to the product page to purchase."}</p>}
  </section></InternalPageShell>;
}
