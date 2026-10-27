"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { FloatingProductImage } from "@/components/floating-product-image";
import {
  prepareHomeHeroAction,
  saveHomeAppearanceAction,
  saveHomeHeroOnlyAction,
  uploadHomeHeroAction,
  removeUploadedHomeHeroAction,
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
  uploaded?: boolean;
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
          uploaded: Boolean(initial.uploaded),
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
  const [heroMode, setHeroMode] = useState<"selected" | "random" | "upload">(initial.uploaded ? "upload" : initial.productId ? "selected" : "upload");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [savedUploadId, setSavedUploadId] = useState(initial.uploaded ? initial.cutoutId : "");
  const uploadInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (uploadPreview) URL.revokeObjectURL(uploadPreview); }, [uploadPreview]);
  function selectUpload(file: File | null) {
    setUploadFile(file);
    setUploadPreview(file ? URL.createObjectURL(file) : "");
    if (!file && uploadInput.current) uploadInput.current.value = "";
  }
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
          setReady({ id: result.id, imageUrl: result.imageUrl, uploaded: false });
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
  const previewUrl = heroMode === "upload" ? uploadPreview || (ready?.uploaded ? ready.imageUrl : "") : ready?.imageUrl;
  const cannotSave = (heroMode === "selected" && (!ready || ready.uploaded)) ||
    (heroMode === "upload" && (!selected || (!uploadFile && !ready?.uploaded)));
  function saveHero() {
    if (cannotSave) return;
    setNoticeArea("hero");
    startTransition(async () => {
      try {
        if (heroMode === "upload" && uploadFile) {
          const form = new FormData();
          form.set("image", uploadFile);
          form.set("productId", selection.productId);
          form.set("scale", String(scale));
          form.set("expectedVersion", version ?? "");
          const uploaded = await uploadHomeHeroAction(form);
          if (uploaded.ok && uploaded.id && uploaded.imageUrl && uploaded.version) {
            setVersion(uploaded.version);
            setReady({ id: uploaded.id, imageUrl: uploaded.imageUrl, uploaded: true });
            setSavedUploadId(uploaded.id);
            selectUpload(null);
            setNotice("عکس شفاف شما ذخیره شد؛ همین عکس در هوم دسکتاپ و موبایل نمایش داده می‌شود.");
          } else setNotice(uploaded.error ?? "بارگذاری انجام نشد؛ عکس قبلی حفظ شد.");
          return;
        }
        const result = await saveHomeHeroOnlyAction({
          ...selection,
          mode: heroMode,
          cutoutId: ready?.id,
          scale,
          expectedVersion: version,
        });
        if (result.ok && result.version) {
          setVersion(result.version);
          if (heroMode !== "upload") setSavedUploadId("");
          setNotice(heroMode === "random"
            ? "نمایش تصادفی ذخیره شد؛ در هر بار بارگذاری هوم، یکی از آثار آماده انتخاب می‌شود."
            : "عکس بدون زمینه با حرکت آرام برای بالای هوم ذخیره شد.");
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
      <h1 className="text-2xl">چیدمان هوم و محصول شناور</h1>
      <p className="text-sm leading-8 text-white/80">
        برای نمایش عکس آمادهٔ خودتان، «بارگذاری عکس شفاف» را انتخاب کنید، محصول مربوط را مشخص کنید و عکس PNG یا WebP بدون زمینه را بدهید.
        پیش‌نمایش را بررسی کنید و «ذخیره برای هوم» را بزنید. عکس‌های صفحهٔ محصول تغییر نمی‌کنند.
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
          <span>روش نمایش محصول</span>
          <select className={field} aria-label="روش نمایش محصول" value={heroMode}
            onChange={event => setHeroMode(event.target.value as "selected" | "random" | "upload")}>
            <option value="upload">بارگذاری عکس شفاف خودم برای هوم</option>
            <option value="selected">همیشه محصول انتخاب‌شده</option>
            <option value="random">تصادفی از عکس‌های بدون زمینهٔ آماده</option>
          </select>
        </label>
        <label className="block space-y-2">
            <span>{heroMode === "upload" ? "۱. این عکس مربوط به کدام محصول است؟" : "انتخاب محصول و آماده‌سازی عکس"}</span>
          <select
            className={field}
            value={selection.productId}
            onChange={(e) => {
              const p = products.find((p) => p.id === e.target.value);
              if (p?.images[0]) {
                if (heroMode === "upload") {
                  setSelection({ productId: p.id, imageId: p.images[0].id }); setReady(null); selectUpload(null);
                } else prepare(p.id, p.images[0].id);
              }
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
        {heroMode === "upload" && (
          <div className="space-y-3 rounded-2xl border border-[#d9bc82]/40 bg-white/5 p-4">
            <label className="block space-y-3">
              <span>۲. عکس بدون زمینه را انتخاب کنید</span>
              <input ref={uploadInput} key={selection.productId} type="file" accept="image/png,image/webp" disabled={!selected}
                aria-label="عکس شفاف هوم" className={field}
                onChange={event => {
                  const file = event.target.files?.[0] ?? null;
                  setNoticeArea("hero");
                  if (file && file.size > 8 * 1024 * 1024) {
                    selectUpload(null); setNotice("حجم عکس باید حداکثر ۸ مگابایت باشد."); event.target.value = ""; return;
                  }
                  selectUpload(file);
                  setNotice(file ? "پیش‌نمایش عکس شما آماده است؛ برای انتشار، ذخیره برای هوم را بزنید." : "");
                }} />
            </label>
            <p className="text-sm leading-7 text-white/75">حداکثر ۸ مگابایت؛ PNG یا WebP ثابت و واقعاً شفاف. عکس با زمینهٔ سفید یا شطرنجیِ چاپ‌شده پذیرفته نمی‌شود.</p>
            {uploadFile && <button type="button" className="eloria-action" onClick={() => selectUpload(null)}>انصراف از عکس جدید</button>}
            {savedUploadId && <button type="button" className="eloria-action" onClick={() => {
              setNoticeArea("hero");
              startTransition(async () => {
                try {
                  const result = await removeUploadedHomeHeroAction({ id: savedUploadId, expectedVersion: version });
                  if (result.ok && result.version) {
                    setVersion(result.version); setSavedUploadId(""); setReady(null); selectUpload(null); setHeroMode("random");
                    setNotice("عکس بارگذاری‌شده از نمایش هوم حذف شد؛ نمایش به عکس‌های شفاف آماده برمی‌گردد.");
                  } else setNotice(result.error ?? "حذف از نمایش انجام نشد.");
                } catch { setNotice("ارتباط قطع شد؛ صفحه را تازه کنید."); }
              });
            }}>حذف عکس بارگذاری‌شده از نمایش هوم</button>}
          </div>
        )}
        {selected && heroMode !== "upload" && (
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
            <figcaption className="mb-2 text-sm">{heroMode === "upload" ? "عکس انتخاب‌شده روی زمینهٔ شطرنجی" : "عکس اصلی"}</figcaption>
            <div className="eloria-upload-checker relative aspect-square overflow-hidden rounded-3xl bg-[#e9dfef]">
              {(heroMode === "upload" ? previewUrl : source?.imageUrl) && (
                <Image
                  unoptimized
                  src={(heroMode === "upload" ? previewUrl : source?.imageUrl)!}
                  alt="عکس اصلی محصول"
                  fill
                  className="object-contain p-5"
                />
              )}
            </div>
          </figure>
          <figure>
            <figcaption className="mb-2 text-sm">
              پیش‌نمایش محصول شناور روی هوم
            </figcaption>
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#47334f] bg-[radial-gradient(ellipse_at_center,#a38aad40,transparent)]">
              {previewUrl && (
                <FloatingProductImage
                  unoptimized
                  src={previewUrl}
                  cutoutSrc={previewUrl}
                  alt={selected?.nameFa ?? "دستبند بدون زمینه"}
                  sizes="(max-width:640px) 100vw, 50vw"
                  scale={scale}
                  paused={previewPaused || busy}
                />
              )}
              {!previewUrl && (
                <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm leading-8 text-white/85">
                  {preparing
                    ? "در حال حذف زمینه؛ لطفاً تا نمایش پیش‌نمایش صبر کنید…"
                    : heroMode === "upload" ? "محصول را انتخاب کنید و عکس شفاف خودتان را بارگذاری کنید." : "یک عکس انتخاب کنید یا دکمهٔ «حذف زمینه و ساخت پیش‌نمایش» را بزنید."}
                </p>
              )}
            </div>
            {previewUrl && (
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
        {source && heroMode !== "upload" && (
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
          disabled={cannotSave}
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
