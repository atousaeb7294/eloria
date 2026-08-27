"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpLeft, Pause, Play } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";

import { recordClientMeasurement } from "@/lib/site-measurement-client";

type FeaturedAlbumItem = { slug: string; name: string; imageUrl: string; href: string };
const AUTOPLAY_MS = 5600;
const FALLBACK_IMAGES = ["/images/collections/bracelet.jpg", "/images/collections/earring.jpg", "/images/collections/necklaces.jfif"];

function fallbackItems(locale: string): FeaturedAlbumItem[] {
  const names = locale === "fa"
    ? ["دست‌بندهای دست‌ساز", "گوشواره‌های منتخب", "گردن‌آویزهای روایی"]
    : ["Artisan bracelets", "Curated earrings", "Narrative necklaces"];
  return FALLBACK_IMAGES.map((imageUrl, index) => ({
    slug: `carousel-fallback-${index}`,
    name: names[index] ?? names[0]!, imageUrl, href: `/${locale}/products`,
  }));
}

export function HomeFeaturedAlbum({ locale }: { locale: string }) {
  const isPersian = locale === "fa";
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const fallback = useMemo(() => fallbackItems(locale), [locale]);
  const [items, setItems] = useState(fallback);
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
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
    const timer = window.setInterval(() => {
      setDirection(1);
      setActive((value) => (value + 1) % items.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [items.length, paused, reducedMotion]);

  const previous = () => {
    setDirection(-1);
    setActive((value) => (value - 1 + items.length) % items.length);
  };
  const next = () => {
    setDirection(1);
    setActive((value) => (value + 1) % items.length);
  };
  const goTo = (index: number) => {
    if (index === active) return;
    setDirection(index > active ? 1 : -1);
    setActive(index);
  };
  const current = items[active] ?? fallback[0]!;
  const before = items[(active - 1 + items.length) % items.length] ?? current;
  const after = items[(active + 1) % items.length] ?? current;

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
      aria-label={isPersian ? "اسلایدشوی آثار الوریا" : "Eloria creations slideshow"}
      className="relative mx-auto max-w-[1280px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
    >
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[46%] h-[28rem] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(24,117,84,.18),rgba(211,174,78,.06)_45%,transparent_72%)] blur-3xl" />

      <div className="relative flex min-h-[540px] items-center justify-center overflow-hidden sm:min-h-[680px] lg:min-h-[760px]">
        {[before, after].map((item, index) => (
          <button
            key={`${item.slug}-${index}`}
            type="button"
            onClick={index === 0 ? previous : next}
            aria-label={index === 0 ? (isPersian ? "اثر قبلی" : "Previous creation") : (isPersian ? "اثر بعدی" : "Next creation")}
            className={`absolute top-1/2 hidden aspect-[4/5] w-[25%] -translate-y-1/2 overflow-hidden rounded-[2rem] border border-[#dfc16f]/12 bg-[#03130d] opacity-45 shadow-[0_30px_90px_rgba(0,0,0,.34)] transition duration-700 hover:opacity-70 lg:block ${index === 0 ? "left-[2%] -rotate-[3deg]" : "right-[2%] rotate-[3deg]"}`}
          >
            <Image src={item.imageUrl} alt="" fill sizes="25vw" className="object-cover" />
            <span className="absolute inset-0 bg-[#01100b]/20" />
          </button>
        ))}

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.article
            key={current.slug}
            custom={direction}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.982, x: direction * 20, filter: "blur(10px) saturate(.92)" }}
            animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px) saturate(1)" }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 1.012, x: direction * -14, filter: "blur(7px) saturate(.96)" }}
            transition={{ duration: reducedMotion ? 0 : 1.05, ease: [0.22, 1, 0.36, 1] }}
            className="group relative z-10 aspect-[4/5] w-[88%] max-w-[500px] overflow-hidden rounded-[2rem] border border-[#e4c878]/24 bg-[#03140e] shadow-[0_45px_140px_rgba(0,0,0,.52),0_0_55px_rgba(218,183,91,.08)] will-change-[transform,opacity,filter] sm:w-[64%] sm:max-w-[560px] sm:rounded-[2.6rem] lg:w-[44%] lg:max-w-[610px]"
          >
            <Link href={current.href} prefetch onClick={() => select(current)} className="absolute inset-0">
              <motion.div
                className="absolute inset-0"
                initial={reducedMotion ? false : { scale: 1.045, x: direction * 10 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ duration: reducedMotion ? 0 : 1.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image src={current.imageUrl} alt={current.name} fill priority fetchPriority="high" sizes="(max-width: 640px) 88vw, (max-width: 1024px) 64vw, 44vw" className="object-cover transition-transform duration-[1800ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.025] motion-reduce:transition-none" />
              </motion.div>

              {!reducedMotion ? (
                <>
                  <motion.span
                    aria-hidden="true"
                    initial={{ x: direction > 0 ? "-125%" : "125%", opacity: 0.75, skewX: direction > 0 ? -8 : 8 }}
                    animate={{ x: direction > 0 ? "125%" : "-125%", opacity: [0.72, 0.5, 0] }}
                    transition={{ duration: 1.18, ease: [0.22, 1, 0.36, 1] }}
                    className="pointer-events-none absolute -inset-y-[12%] left-[-20%] w-[64%] bg-[linear-gradient(90deg,transparent_0%,rgba(8,40,29,.10)_18%,rgba(230,199,117,.10)_38%,rgba(255,246,220,.30)_50%,rgba(225,190,103,.08)_62%,rgba(3,24,17,.10)_82%,transparent_100%)] blur-[10px] mix-blend-screen will-change-transform"
                  />
                  <motion.span
                    aria-hidden="true"
                    initial={{ x: direction > 0 ? "-105%" : "105%", opacity: 0 }}
                    animate={{ x: direction > 0 ? "105%" : "-105%", opacity: [0, 0.42, 0] }}
                    transition={{ duration: 1.4, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-none absolute inset-y-0 w-[28%] bg-[linear-gradient(90deg,transparent,rgba(250,230,168,.16),transparent)] blur-[22px] mix-blend-soft-light will-change-transform"
                  />
                </>
              ) : null}

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,8,6,.02)_32%,rgba(1,9,6,.14)_61%,rgba(1,8,6,.94)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-center sm:p-9">
                <p className="text-[9px] font-semibold tracking-[.22em] text-[#e2c674]/68">ELORIA · {String(active + 1).padStart(2, "0")}</p>
                <h3 className={isPersian ? "font-persian-title mt-3 text-2xl text-[#fff1cf] sm:text-3xl" : "mt-3 font-serif text-3xl text-[#fff1cf] sm:text-4xl"}>{current.name}</h3>
                <span className="mx-auto mt-5 inline-flex items-center gap-2 border-b border-[#e5c978]/36 pb-1.5 text-[11px] text-[#efd994] transition group-hover:border-[#efd994]/80">
                  {isPersian ? "مشاهده اثر" : "View creation"}<ArrowUpLeft className="size-3.5" />
                </span>
              </div>
              <span className="absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-[#ffe6a0]/75 to-transparent" />
            </Link>
          </motion.article>
        </AnimatePresence>
      </div>

      <div className="relative z-20 mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-[#dfc16f]/16 bg-[#031710]/82 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,.32)] backdrop-blur-xl sm:gap-3">
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
          <button key={item.slug} type="button" onClick={() => goTo(index)} aria-label={`${isPersian ? "اسلاید" : "Slide"} ${index + 1}`} className="h-1 flex-1 overflow-hidden rounded-full bg-[#dfc16f]/12">
            {index === active ? (
              <motion.span
                key={`${item.slug}-${active}-${paused ? "paused" : "playing"}`}
                className="block h-full origin-start rounded-full bg-[linear-gradient(90deg,#b89445,#f1d98f,#d6b45b)]"
                initial={{ scaleX: paused || reducedMotion ? 1 : 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: paused || reducedMotion ? 0 : AUTOPLAY_MS / 1000, ease: "linear" }}
              />
            ) : null}
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
