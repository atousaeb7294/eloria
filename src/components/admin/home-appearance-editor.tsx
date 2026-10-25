"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { FloatingProductImage } from "@/components/floating-product-image";
import {
  prepareHomeHeroAction,
  saveHomeAppearanceAction,
  saveHomeHeroOnlyAction,
} from "@/app/[locale]/admin/(protected)/appearance/actions";

type Product = {
  id: string;
  nameFa: string;
  slug: string;
  images: { id: string; imageUrl: string }[];
};
type FeaturedCutout = { id: string; productId: string; sourceImageId: string };
type Initial = {
  featuredCutouts: FeaturedCutout[];
  productId: string;
  imageId: string;
  cutoutId: string;
  scale: number;
  featuredIds: string[];
  version: string | null;
};
const field =
  "w-full rounded-xl border border-white/20 bg-[#261e35] px-3 py-3 text-base text-white";

export function HomeAppearanceEditor({
  products,
  initial,
}: {
  products: Product[];
  initial: Initial;
}) {
  const [selection, setSelection] = useState({
    productId: initial.productId,
    imageId: initial.imageId,
  });
  const [ready, setReady] = useState(
    initial.cutoutId
      ? {
          id: initial.cutoutId,
          imageUrl: `/api/media/hero/${initial.cutoutId}`,
        }
      : null,
  );
  const [scale, setScale] = useState(initial.scale);
  const [featured, setFeatured] = useState(initial.featuredIds);
  const [featuredCutouts, setFeaturedCutouts] = useState(
    initial.featuredCutouts,
  );
  const [version, setVersion] = useState(initial.version);
  const [previewPaused, setPreviewPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeArea, setNoticeArea] = useState<"hero" | "featured">("hero");
  const [preparing, setPreparing] = useState(false);
  const [busy, startTransition] = useTransition();
  const selected = products.find((p) => p.id === selection.productId);
  const source = selected?.images.find((i) => i.id === selection.imageId);
  const matches = products.filter((p) =>
    `${p.nameFa} ${p.slug}`.toLowerCase().includes(query.toLowerCase()),
  );

  function prepare(productId: string, imageId: string) {
    setNoticeArea("hero");
    setPreparing(true);
    setSelection({ productId, imageId });
    setReady(null);
    setNotice("در حال جداسازی زمینه و آماده‌سازی عکس…");
    startTransition(async () => {
      try {
        const result = await prepareHomeHeroAction(productId, imageId);
        if (result.ok) {
          setReady({ id: result.id, imageUrl: result.imageUrl });
          setNotice(
            "عکس آماده است. جزئیات بند و سنگ‌ها را در پیش‌نمایش بررسی کنید و سپس ذخیره کنید.",
          );
        } else setNotice(result.error);
      } catch {
        setNotice("ارتباط قطع شد. دوباره تلاش کنید؛ هوم قبلی تغییر نکرده است.");
      } finally {
        setPreparing(false);
      }
    });
  }
  function move(index: number, delta: number) {
    const next = [...featured];
    const other = index + delta;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    setFeatured(next);
  }
  function saveHero() {
    if (!ready) return;
    setNoticeArea("hero");
    startTransition(async () => {
      try {
        const result = await saveHomeHeroOnlyAction({
          ...selection,
          scale,
          expectedVersion: version,
        });
        if (result.ok && result.version) {
          setVersion(result.version);
          setNotice("عکس بدون زمینه با حرکت آرام برای بالای هوم ذخیره شد.");
        } else setNotice(result.error ?? "ذخیره انجام نشد.");
      } catch {
        setNotice(
          "ارتباط قطع شد؛ وضعیت ذخیره را با تازه‌کردن صفحه بررسی کنید.",
        );
      }
    });
  }
  function save() {
    if (featured.length !== 8) return;
    setNoticeArea("featured");
    startTransition(async () => {
      try {
        const prepared: FeaturedCutout[] = [];
        for (const [index, productId] of featured.entries()) {
          const product = products.find((p) => p.id === productId);
          if (!product?.images[0]) {
            setNotice("یکی از منتخب‌ها عکس معتبر ندارد.");
            return;
          }
          setNotice(
            `آماده‌سازی عکس دایره‌ای ${index + 1} از ۸: ${product.nameFa}…`,
          );
          const cutout = await prepareHomeHeroAction(
            product.id,
            product.images[0].id,
          );
          if (!cutout.ok) {
            setNotice(
              `${product.nameFa}: ${cutout.error} تنظیمات قبلی حفظ شد.`,
            );
            return;
          }
          prepared.push({
            id: cutout.id,
            productId,
            sourceImageId: product.images[0].id,
          });
          setFeaturedCutouts([...prepared]);
        }
        const result = await saveHomeAppearanceAction({
          featuredIds: featured,
          featuredCutoutIds: prepared.map((c) => c.id),
          expectedVersion: version,
        });
        if (result.ok && result.version) {
          setVersion(result.version);
          setNotice("هشت منتخب ذخیره شدند؛ محصول اصلی هوم حفظ شد.");
        } else setNotice(result.error ?? "ذخیره انجام نشد.");
      } catch {
        setNotice(
          "ارتباط قطع شد؛ وضعیت ذخیره را با تازه‌کردن صفحه بررسی کنید.",
        );
      }
    });
  }
  return (
    <section className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <h1 className="text-2xl">چیدمان هوم و دستبند شناور</h1>
      <p className="text-sm leading-8 text-white/80">
        ۱. محصول و عکس واضح آن را انتخاب کنید؛ حذف زمینه خودکار شروع می‌شود. ۲.
        صبر کنید تا عکس بدون زمینه در پیش‌نمایش دیده شود و جزئیات آن را بررسی
        کنید. ۳. «ذخیره برای هوم» را بزنید. عکس اصلی محصول حفظ می‌شود و دستبند
        با حرکت آرام نمایش داده خواهد شد.
      </p>
      <label className="block space-y-2">
        <span>جست‌وجوی محصولات</span>
        <input
          className={field}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="نام یا شناسهٔ محصول"
        />
      </label>
      <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
        <label className="block space-y-2">
          <span>محصول اصلی هوم</span>
          <select
            className={field}
            value={selection.productId}
            onChange={(e) => {
              const p = products.find((p) => p.id === e.target.value);
              if (p?.images[0]) prepare(p.id, p.images[0].id);
            }}
          >
            <option value="" disabled>
              یک محصول انتخاب کنید
            </option>
            {products
              .filter(
                (p) => matches.includes(p) || p.id === selection.productId,
              )
              .map((p) => (
                <option value={p.id} key={p.id}>
                  {p.nameFa}
                </option>
              ))}
          </select>
        </label>
        {selected && (
          <label className="block space-y-2">
            <span>عکس محصول برای آماده‌سازی</span>
            <select
              className={field}
              value={selection.imageId}
              onChange={(e) => prepare(selected.id, e.target.value)}
            >
              {selected.images.map((im, i) => (
                <option key={im.id} value={im.id}>
                  تصویر {i + 1}
                  {i === 0 ? " — اصلی" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <figure>
            <figcaption className="mb-2 text-sm">عکس اصلی</figcaption>
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#e9dfef]">
              {source && (
                <Image
                  unoptimized
                  src={source.imageUrl}
                  alt="عکس اصلی محصول"
                  fill
                  className="object-contain p-5"
                />
              )}
            </div>
          </figure>
          <figure>
            <figcaption className="mb-2 text-sm">
              پیش‌نمایش دستبند شناور روی هوم
            </figcaption>
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#47334f] bg-[radial-gradient(ellipse_at_center,#a38aad40,transparent)]">
              {ready && (
                <FloatingProductImage
                  unoptimized
                  src={source?.imageUrl ?? ready.imageUrl}
                  cutoutSrc={ready.imageUrl}
                  alt={selected?.nameFa ?? "دستبند بدون زمینه"}
                  sizes="(max-width:640px) 100vw, 50vw"
                  scale={scale}
                  paused={previewPaused || busy}
                />
              )}
              {!ready && (
                <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm leading-8 text-white/85">
                  {preparing
                    ? "در حال حذف زمینه؛ لطفاً تا نمایش پیش‌نمایش صبر کنید…"
                    : "یک عکس انتخاب کنید یا دکمهٔ «حذف زمینه و ساخت پیش‌نمایش» را بزنید."}
                </p>
              )}
            </div>
            {ready && (
              <button
                type="button"
                className="eloria-action mt-3"
                aria-pressed={previewPaused}
                onClick={() => setPreviewPaused(!previewPaused)}
              >
                {previewPaused ? "شروع حرکت پیش‌نمایش" : "توقف حرکت پیش‌نمایش"}
              </button>
            )}
          </figure>
        </div>
        {source && (
          <button
            type="button"
            className="eloria-action"
            onClick={() => prepare(selection.productId, selection.imageId)}
          >
            {preparing
              ? "در حال آماده‌سازی…"
              : ready
                ? "آماده‌سازی دوبارهٔ عکس"
                : "حذف زمینه و ساخت پیش‌نمایش"}
          </button>
        )}
        <label className="block space-y-2">
          <span>اندازه در هوم: {scale.toLocaleString("fa-IR")}٪</span>
          <input
            aria-label="اندازهٔ تصویر در هوم"
            className="block w-full"
            type="range"
            min="60"
            max="100"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
        </label>
        <p
          role="status"
          aria-live="polite"
          aria-busy={busy && noticeArea === "hero"}
          className="min-h-12 rounded-xl bg-white/10 p-4 text-sm leading-7"
        >
          {noticeArea === "hero" && notice
            ? notice
            : "ذخیرهٔ محصول اصلی مستقل از منتخب‌هاست. پس از آماده‌شدن پیش‌نمایش، آن را ذخیره کنید."}
        </p>
        <button
          type="button"
          disabled={!ready}
          onClick={saveHero}
          className="eloria-action eloria-action-primary"
        >
          ۳. ذخیره برای هوم
        </button>
        <h2 className="pt-4 text-xl">هشت منتخب و ترتیب نمایش</h2>
        <p className="text-sm text-white/75">
          فقط این هشت اثر روی هوم نمایش داده می‌شوند. عکس اصلی هر کدام هنگام
          ذخیره به‌صورت خودکار برای نمایش دایره‌ای آماده می‌شود.
        </p>
        <ol className="space-y-2">
          {featured.map((id, i) => (
            <li
              key={id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-white/15 p-2"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#c6a45f]/70 bg-[#e5d9ec]">
                {featuredCutouts.find((c) => c.productId === id) && (
                  <Image
                    unoptimized
                    src={`/api/media/hero/${featuredCutouts.find((c) => c.productId === id)!.id}`}
                    alt="پیش‌نمایش دایره‌ای محصول"
                    fill
                    className="object-contain p-2"
                  />
                )}
              </div>
              <span className="min-w-0 flex-1">
                {i + 1}.{" "}
                {products.find((p) => p.id === id)?.nameFa ??
                  "محصول ناموجود؛ حذف کنید"}
              </span>
              <button
                type="button"
                disabled={i === 0}
                className="min-h-11 min-w-11 disabled:opacity-30"
                aria-label="انتقال به بالا"
                onClick={() => move(i, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={i === featured.length - 1}
                className="min-h-11 min-w-11 disabled:opacity-30"
                aria-label="انتقال به پایین"
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="min-h-11 px-3"
                aria-label={`حذف ${products.find((p) => p.id === id)?.nameFa ?? "منتخب"}`}
                onClick={() => setFeatured(featured.filter((p) => p !== id))}
              >
                حذف
              </button>
            </li>
          ))}
        </ol>
        <label className="block space-y-2">
          <span>افزودن به منتخب‌ها ({featured.length}/۸)</span>
          <select
            className={field}
            disabled={featured.length >= 8}
            value=""
            onChange={(e) => {
              if (e.target.value && featured.length < 8)
                setFeatured([...featured, e.target.value]);
            }}
          >
            <option value="">یک اثر اضافه کنید</option>
            {matches
              .filter((p) => !featured.includes(p.id))
              .map((p) => (
                <option value={p.id} key={p.id}>
                  {p.nameFa}
                </option>
              ))}
          </select>
        </label>
        <button
          type="button"
          disabled={featured.length !== 8}
          onClick={save}
          className="eloria-action eloria-action-primary"
        >
          آماده‌سازی و ذخیرهٔ منتخب‌ها
        </button>
      </fieldset>
      <p
        role="status"
        aria-live="polite"
        aria-busy={busy && noticeArea === "featured"}
        className="min-h-12 rounded-xl bg-white/10 p-4 text-sm leading-7"
      >
        {noticeArea === "featured" && notice
          ? notice
          : "هشت منتخب را انتخاب کنید؛ آماده‌سازی و ذخیرهٔ آن‌ها با دکمهٔ بالا انجام می‌شود."}
      </p>
    </section>
  );
}
