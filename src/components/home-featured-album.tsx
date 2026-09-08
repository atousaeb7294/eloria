"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpLeft, Pause, Play } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";

import { recordClientMeasurement } from "@/lib/site-measurement-client";

type FeaturedAlbumItem = { slug: string; name: string; imageUrl: string; href: string };
type OrbitItem = FeaturedAlbumItem & { relative: number; index: number };

type OrbitPose = {
  x: string;
  y: number;
  z: number;
  scale: number;
  rotateY: number;
  rotateZ: number;
};

const AUTOPLAY_MS = 4800;
const ORBIT_DURATION = 1.08;
const FALLBACK_IMAGES = ["/images/collections/bracelet.webp", "/images/collections/earring.webp", "/images/collections/necklaces.webp"];

function fallbackItems(locale: string): FeaturedAlbumItem[] {
  const names = locale === "fa"
    ? ["دست‌بندهای دست‌ساز", "گوشواره‌های منتخب", "گردن‌آویزهای روایی"]
    : ["Artisan bracelets", "Curated earrings", "Narrative necklaces"];
  return FALLBACK_IMAGES.map((imageUrl, index) => ({
    slug: `carousel-fallback-${index}`,
    name: names[index] ?? names[0]!, imageUrl, href: `/${locale}/products`,
  }));
}

function wrappedIndex(value: number, length: number) {
  return ((value % length) + length) % length;
}

function orbitPose(relative: number): OrbitPose {
  if (relative === 0) {
    return { x: "0%", y: 0, z: 82, scale: 1, rotateY: 0, rotateZ: 0 };
  }
  if (relative === -1) {
    return { x: "-74%", y: 24, z: 4, scale: 0.865, rotateY: 7.5, rotateZ: -1.2 };
  }
  if (relative === 1) {
    return { x: "74%", y: 24, z: 4, scale: 0.865, rotateY: -7.5, rotateZ: 1.2 };
  }
  if (relative < 0) {
    return { x: "-128%", y: 48, z: -72, scale: 0.73, rotateY: 11, rotateZ: -2.2 };
  }
  return { x: "128%", y: 48, z: -72, scale: 0.73, rotateY: -11, rotateZ: 2.2 };
}

function offstagePose(relative: number): OrbitPose {
  const direction = relative < 0 ? -1 : 1;
  return {
    x: `${direction * 176}%`,
    y: 68,
    z: -150,
    scale: 0.62,
    rotateY: direction * -14,
    rotateZ: direction * 3.2,
  };
}

export function HomeFeaturedAlbum({ locale }: { locale: string }) {
  const isPersian = locale === "fa";
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const fallback = useMemo(() => fallbackItems(locale), [locale]);
  const [items, setItems] = useState(fallback);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2200);
    void fetch(`/api/home-featured-products?locale=${encodeURIComponent(locale)}`, { cache: "default", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { items?: FeaturedAlbumItem[] } | null) => {
        if (!payload?.items || payload.items.length < 3) return;
        const nextItems = payload.items.slice(0, 8);
        setItems(nextItems);
        setActive(0);
        const prefetch = () => nextItems.slice(0, 4).forEach((item) => router.prefetch(item.href));
        const browser = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number };
        if (browser.requestIdleCallback) browser.requestIdleCallback(prefetch, { timeout: 1400 });
        else globalThis.setTimeout(prefetch, 200);
      })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timeout));
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [locale, router]);

  useEffect(() => {
    if (paused || reducedMotion || items.length < 2) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % items.length), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [items.length, paused, reducedMotion]);

  const orbitItems = useMemo<OrbitItem[]>(() => {
    if (!items.length) return [];
    const positions = [-2, -1, 0, 1, 2];
    const unique = new Map<number, OrbitItem>();
    positions.forEach((relative) => {
      const index = wrappedIndex(active + relative, items.length);
      const existing = unique.get(index);
      if (existing && Math.abs(existing.relative) <= Math.abs(relative)) return;
      const item = items[index];
      if (item) unique.set(index, { ...item, index, relative });
    });
    return [...unique.values()].sort((a, b) => a.relative - b.relative);
  }, [active, items]);

  const previous = () => setActive((value) => (value - 1 + items.length) % items.length);
  const next = () => setActive((value) => (value + 1) % items.length);
  const select = (item: FeaturedAlbumItem) => recordClientMeasurement({
    event_type: "select_item", locale: isPersian ? "fa" : "en", path: `/${locale}`, product_slug: item.slug,
  });

  const handleTouchEnd = (end: number) => {
    if (touchStart.current === null) return;
    const distance = end - touchStart.current;
    if (Math.abs(distance) > 45) (distance > 0 ? previous : next)();
    touchStart.current = null;
  };

  return (
    <div
      dir={isPersian ? "rtl" : "ltr"}
      role="region"
      aria-roledescription="carousel"
      aria-label={isPersian ? "ویترین چرخان آثار الوریا" : "Eloria revolving creations showcase"}
      className="relative mx-auto max-w-[1320px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
    >
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[46%] h-[27rem] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(24,117,84,.15),rgba(211,174,78,.05)_46%,transparent_72%)] blur-3xl" />

      <div
        className="relative flex min-h-[560px] items-center justify-center overflow-hidden sm:min-h-[690px] lg:min-h-[780px]"
        style={{ perspective: "1650px", perspectiveOrigin: "50% 46%" }}
      >
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          <AnimatePresence initial={false}>
            {orbitItems.map((item) => {
              const isCurrent = item.relative === 0;
              const isAdjacent = Math.abs(item.relative) === 1;
              const pose = orbitPose(item.relative);
              const entryPose = offstagePose(item.relative || 1);

              return (
                <motion.article
                  key={item.slug}
                  initial={reducedMotion ? false : entryPose}
                  animate={pose}
                  exit={reducedMotion ? undefined : offstagePose(item.relative || -1)}
                  transition={{ duration: reducedMotion ? 0 : ORBIT_DURATION, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute inset-0 m-auto aspect-[4/5] w-[78%] max-w-[520px] overflow-hidden rounded-[2rem] border bg-[#03140e] will-change-transform sm:w-[59%] sm:max-w-[570px] sm:rounded-[2.6rem] lg:w-[43%] lg:max-w-[610px] ${isCurrent ? "border-[#e8cf86]/28 shadow-[0_48px_145px_rgba(0,0,0,.54),0_0_48px_rgba(218,183,91,.07)]" : "border-[#dfc16f]/12 shadow-[0_28px_90px_rgba(0,0,0,.34)]"}`}
                  style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
                >
                  {isCurrent ? (
                    <Link href={item.href} prefetch onClick={() => select(item)} className="group absolute inset-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        priority
                        fetchPriority="high"
                        sizes="(max-width: 640px) 78vw, (max-width: 1024px) 59vw, 43vw"
                        className="object-cover transition-transform duration-[1350ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.025] motion-reduce:transition-none"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,8,6,.02)_32%,rgba(1,8,6,.12)_62%,rgba(1,8,6,.93)_100%)]" />
                      <div className="absolute inset-x-0 bottom-0 p-6 text-center sm:p-9">
                        <p className="text-[9px] font-semibold tracking-[.22em] text-[#e2c674]/68">ELORIA · {String(active + 1).padStart(2, "0")}</p>
                        <h3 className={isPersian ? "font-persian-title mt-3 text-2xl text-[#fff1cf] sm:text-3xl" : "mt-3 font-serif text-3xl text-[#fff1cf] sm:text-4xl"}>{item.name}</h3>
                        <span className="mx-auto mt-5 inline-flex items-center gap-2 border-b border-[#e5c978]/36 pb-1.5 text-[11px] text-[#efd994] transition group-hover:border-[#efd994]/80">
                          {isPersian ? "مشاهده اثر" : "View creation"}<ArrowUpLeft className="size-3.5" />
                        </span>
                      </div>
                      <span className="absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-[#ffe6a0]/70 to-transparent" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={item.relative < 0 ? previous : next}
                      aria-label={item.relative < 0 ? (isPersian ? "اثر قبلی" : "Previous creation") : (isPersian ? "اثر بعدی" : "Next creation")}
                      tabIndex={isAdjacent ? 0 : -1}
                      className={`absolute inset-0 text-start ${isAdjacent ? "cursor-pointer" : "pointer-events-none"}`}
                    >
                      <Image src={item.imageUrl} alt="" fill sizes="(max-width: 640px) 78vw, (max-width: 1024px) 59vw, 43vw" className="object-cover" />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,8,6,.10),rgba(1,8,6,.34))]" />
                      {isAdjacent ? (
                        <span className="absolute inset-x-5 bottom-6 truncate text-center text-[10px] font-medium tracking-[.08em] text-[#f0d991]/70 sm:bottom-8 sm:text-xs">{item.name}</span>
                      ) : null}
                    </button>
                  )}
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative z-20 mx-auto mt-2 flex w-fit items-center gap-2 rounded-full border border-[#dfc16f]/16 bg-[#031710]/82 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,.32)] backdrop-blur-xl sm:gap-3">
        <button type="button" onClick={previous} aria-label={isPersian ? "اثر قبلی" : "Previous creation"} className="grid size-11 place-items-center rounded-full border border-[#dfc16f]/14 text-[#e5ca7c] transition hover:border-[#e7cc7e]/45 hover:bg-[#d7b85e]/[.08]">
          {isPersian ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
        </button>
        <div className="flex min-w-28 items-center justify-center gap-2 px-3 text-[10px] tracking-[.16em] text-[#d8c28a]/52">
          <span className="text-sm font-semibold text-[#efd78b]">{String(active + 1).padStart(2, "0")}</span><span>/</span><span>{String(items.length).padStart(2, "0")}</span>
        </div>
        <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? (isPersian ? "ادامه پخش" : "Resume slideshow") : (isPersian ? "توقف پخش" : "Pause slideshow")} className="grid size-9 place-items-center rounded-full text-[#d9c381]/64 transition hover:text-[#f1d88d]">
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </button>
        <button type="button" onClick={next} aria-label={isPersian ? "اثر بعدی" : "Next creation"} className="grid size-11 place-items-center rounded-full border border-[#dfc16f]/14 text-[#e5ca7c] transition hover:border-[#e7cc7e]/45 hover:bg-[#d7b85e]/[.08]">
          {isPersian ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
        </button>
      </div>

      <div className="mx-auto mt-7 flex max-w-sm gap-1.5" aria-label={isPersian ? "انتخاب اسلاید" : "Choose a slide"}>
        {items.map((item, index) => (
          <button key={item.slug} type="button" onClick={() => setActive(index)} aria-label={`${isPersian ? "اسلاید" : "Slide"} ${index + 1}`} className="h-1 flex-1 overflow-hidden rounded-full bg-[#dfc16f]/12">
            <span className={`block h-full origin-start rounded-full bg-[#e3c675] transition-transform duration-500 ${index === active ? "scale-x-100" : "scale-x-0"}`} />
          </button>
        ))}
      </div>

      <div className="mt-9 text-center">
        <Link href={`/${locale}/products`} prefetch className="inline-flex items-center gap-3 text-xs font-semibold text-[#ead18a] transition hover:text-[#ffe4a0]">
          {isPersian ? "مشاهده تمام آثار" : "View every creation"}<span className="h-px w-12 bg-current/45" />
        </Link>
      </div>
    </div>
  );
}
