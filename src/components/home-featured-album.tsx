"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpLeft, ShoppingBag } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCardLivePrice } from "@/components/product-card-live-price";
import { recordClientMeasurement } from "@/lib/site-measurement-client";

type StoryItem = {
  slug: string;
  name: string;
  imageUrl: string;
  href: string;
  badge?: string;
  collectionName?: string;
  material?: "GOLD" | "SILVER";
  hasGold?: boolean;
  hasSilver?: boolean;
  audience?: "WOMEN" | "MEN";
  stock?: number;
};

type StoryFilter = "all" | "gold" | "silver" | "men";

const FALLBACK: StoryItem[] = [
  { slug: "gold", name: "طلای الوریا", imageUrl: "/images/collections/necklaces.webp", href: "/products?material=gold", hasGold: true },
  { slug: "silver", name: "نقرهٔ الوریا", imageUrl: "/images/collections/earring.webp", href: "/products?material=silver", hasSilver: true },
  { slug: "men", name: "گنجینهٔ آقایان", imageUrl: "/images/collections/bracelet.webp", href: "/collections/men", audience: "MEN" },
];

export function HomeFeaturedAlbum({ locale }: { locale: string }) {
  const fa = locale === "fa";
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [items, setItems] = useState(() => FALLBACK.map(item => ({ ...item, href: `/${locale}${item.href}` })));
  const [filter, setFilter] = useState<StoryFilter>("all");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/home-featured-products?locale=${encodeURIComponent(locale)}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then((payload: { items?: StoryItem[] } | null) => {
        if (!payload?.items?.length) return;
        setItems(payload.items);
        payload.items.slice(0, 8).forEach(item => router.prefetch(item.href));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [locale, router]);

  const visible = useMemo(() => items.filter(item => {
    if (filter === "gold") return item.hasGold ?? item.material === "GOLD";
    if (filter === "silver") return item.hasSilver ?? item.material === "SILVER";
    if (filter === "men") return item.audience === "MEN";
    return true;
  }), [filter, items]);

  const filters: Array<{ value: StoryFilter; label: string }> = [
    { value: "all", label: fa ? "همه آثار" : "All creations" },
    { value: "gold", label: fa ? "طلا" : "Gold" },
    { value: "silver", label: fa ? "نقره" : "Silver" },
    { value: "men", label: fa ? "آقایان" : "Men" },
  ];

  const chooseOnHover = (value: StoryFilter) => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setFilter(value), 240);
  };

  return (
    <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
      <nav className="sticky top-24 z-[80] mx-auto mb-[-5.5rem] flex w-fit max-w-[calc(100vw-2rem)] gap-1 overflow-x-auto rounded-full border border-[#ddc16e]/18 bg-[#02140e]/82 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,.38)] backdrop-blur-2xl" aria-label={fa ? "گنجینه‌های ویترین" : "Showcase treasuries"}>
        {filters.map(item => <button key={item.value} type="button" onMouseEnter={() => chooseOnHover(item.value)} onMouseLeave={() => hoverTimer.current && clearTimeout(hoverTimer.current)} onFocus={() => setFilter(item.value)} onClick={() => setFilter(item.value)} className={`shrink-0 rounded-full px-4 py-2 text-[10px] transition ${filter === item.value ? "bg-[#d9b85f]/15 text-[#f4df9f]" : "text-white/50 hover:text-[#ead8aa]"}`}>{item.label}</button>)}
      </nav>

      <div className="relative pt-24">
        {visible.map((item, index) => {
          const purchasable = !item.slug.startsWith("gold") && !item.slug.startsWith("silver") && !item.slug.startsWith("men") && typeof item.stock === "number";
          const sold = purchasable && (item.stock ?? 0) <= 0;
          return (
            <article key={item.slug} className="relative min-h-[112svh]" style={{ zIndex: index + 1 }}>
              <div className="sticky top-0 flex min-h-[100svh] items-center overflow-hidden bg-[#02140e] px-4 py-20 sm:px-8 lg:px-12">
                <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(22,110,78,.16),transparent_40%),linear-gradient(180deg,rgba(2,20,14,.15),rgba(1,12,8,.92))]" />
                <motion.div initial={reducedMotion ? false : { opacity: 0, y: "18%" }} whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: .42 }} transition={{ duration: .8, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto grid w-full max-w-[1450px] gap-7 lg:grid-cols-[minmax(260px,.68fr)_minmax(0,1.45fr)] lg:items-center lg:gap-14">
                  <div className="order-2 lg:order-1">
                    <p className="text-[9px] tracking-[.28em] text-[#d9bd6e]/58">ELORIA · {String(index + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}</p>
                    <p className="mt-5 text-[10px] text-[#d9c080]/55">{item.badge ?? item.collectionName ?? (fa ? "اثر الوریا" : "Eloria creation")}</p>
                    <h3 className={fa ? "font-persian-title mt-3 text-3xl leading-[1.8] text-[#fff0ca] sm:text-4xl lg:text-5xl" : "mt-3 font-serif text-4xl text-[#fff0ca] sm:text-5xl"}>{item.name}</h3>
                    <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-[#cdbd96]/55">
                      {(item.hasGold ?? item.material === "GOLD") ? <span>✦ {fa ? "طلا" : "Gold"}</span> : null}
                      {(item.hasSilver ?? item.material === "SILVER") ? <span>✦ {fa ? "نقره" : "Silver"}</span> : null}
                      {item.audience === "MEN" ? <span>✦ {fa ? "آقایان" : "Men"}</span> : null}
                      {sold ? <span className="text-rose-200/75">{fa ? "فروخته شده" : "Sold"}</span> : null}
                    </div>

                    {purchasable ? <div className="mt-6 max-w-md space-y-4">
                      <div className="border-y border-white/[.08] py-3"><ProductCardLivePrice slug={item.slug} locale={locale} /></div>
                      <AddToCartButton locale={locale} slug={item.slug} maxQuantity={item.stock ?? 0} />
                    </div> : null}

                    <Link href={item.href} onClick={() => recordClientMeasurement({ event_type: "select_item", locale: fa ? "fa" : "en", path: `/${locale}`, product_slug: item.slug })} className="group mt-6 inline-flex items-center gap-3 border-b border-[#e5c978]/36 pb-2 text-xs text-[#efd994] transition hover:border-[#efd994]">
                      {purchasable ? (fa ? "نمای کامل اثر" : "Full view") : (fa ? "ورود به گنجینه" : "Enter treasury")}<ArrowUpLeft className="size-4 transition group-hover:-translate-x-1 group-hover:-translate-y-1" />
                    </Link>
                  </div>

                  <motion.div initial={reducedMotion ? false : { x: index % 2 === 0 ? "22%" : "-22%", scale: .93 }} whileInView={{ x: 0, scale: 1 }} viewport={{ amount: .35 }} transition={{ duration: .9, ease: [0.22, 1, 0.36, 1] }} className="relative order-1 h-[58svh] min-h-[430px] overflow-hidden rounded-[2rem] border border-[#e8cf86]/20 bg-[#03140e] shadow-[0_45px_140px_rgba(0,0,0,.56)] lg:order-2 lg:h-[78svh] lg:rounded-[3rem]">
                    <Image src={item.imageUrl} alt={item.name} fill priority={index === 0} sizes="(max-width: 1024px) 94vw, 65vw" className="object-cover" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,8,6,.02)_38%,rgba(1,8,6,.12)_68%,rgba(1,8,6,.65))]" />
                    <span className="absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-[#ffe6a0]/70 to-transparent" />
                    {purchasable && !sold ? <span className="absolute bottom-5 end-5 flex items-center gap-2 rounded-full border border-[#e5c978]/28 bg-[#02140e]/70 px-4 py-2 text-[10px] text-[#efd994] backdrop-blur-xl"><ShoppingBag className="size-3.5" />{fa ? "خرید مستقیم از همین صفحه" : "Shop directly here"}</span> : null}
                  </motion.div>
                </motion.div>
                {index < visible.length - 1 ? <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 text-[9px] text-[#d8c28a]/45"><ArrowDown className="size-3.5 animate-bounce" />{fa ? "روایت بعدی" : "Next story"}</div> : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
