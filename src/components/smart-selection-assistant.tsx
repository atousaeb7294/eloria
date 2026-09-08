"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Gift, Gem, Search, Sparkles, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type Recipient = "self" | "gift";
type Style = "delicate" | "classic" | "mysterious" | "bold" | "free";
type Material = "gold" | "silver" | "all";
type Collection = "necklaces" | "bracelets" | "earrings" | "all";

type Recommendation = {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  material: "GOLD" | "SILVER";
  collectionSlug: string;
  displayPriceToman: string | null;
  image: { imageUrl: string; altFa: string | null; altEn: string | null } | null;
  reason: string;
  matchText?: string | null;
  seo?: { title: string; description: string };
};

type ResponsePayload = {
  successful: boolean;
  products?: Recommendation[];
  message?: string;
};

function digits(value: string): string {
  return value
    .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^\d]/g, "")
    .slice(0, 15);
}

const fallbackImages: Record<string, string> = {
  necklaces: "/images/collections/necklaces.webp",
  bracelets: "/images/collections/bracelet.webp",
  earrings: "/images/collections/earring.webp",
};

function SelectionOption({ selected, onClick, icon, title, subtitle }: {
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`relative min-h-20 rounded-2xl border p-4 text-start transition ${selected ? "border-[#efd47f]/70 bg-[#d9b85f]/[.12] shadow-[0_0_28px_rgba(217,184,95,.08)]" : "border-white/[.08] bg-white/[.025] hover:border-[#d9b85f]/30"}`}>
      <div className="flex items-start gap-3">
        {icon ? <span className="mt-0.5 text-[#e5ca78]">{icon}</span> : null}
        <span className="min-w-0">
          <span className="block text-sm text-[#f4e8cc]">{title}</span>
          {subtitle ? <span className="mt-1 block text-[11px] leading-5 text-[#bfae8c]/58">{subtitle}</span> : null}
        </span>
      </div>
      {selected ? <Check className="absolute end-3 top-3 size-4 text-[#f0d681]" /> : null}
    </button>
  );
}

export function SmartSelectionAssistant({ locale }: { locale: "fa" | "en" }) {
  const pathname = usePathname() ?? `/${locale}`;
  const fa = locale === "fa";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [recipient, setRecipient] = useState<Recipient>("self");
  const [style, setStyle] = useState<Style>("delicate");
  const [material, setMaterial] = useState<Material>("all");
  const [collection, setCollection] = useState<Collection>("all");
  const [budget, setBudget] = useState("");
  const [clue, setClue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Recommendation[] | null>(null);

  const copy = useMemo(() => fa ? {
    eyebrow: "ELORIA SIGNATURE",
    title: "اثر من را پیدا کن",
    description: "چند نشانه از سلیقه و داستانت بده؛ الوریا از میان آثار واقعی و موجود، نزدیک‌ترین انتخاب‌ها را پیدا می‌کند.",
    close: "بستن همراه هوشمند",
    back: "قبلی",
    next: "بعدی",
    find: "پیدا کردن اثر من",
    retry: "دوباره امتحان کن",
    resultTitle: "انتخاب الوریا برای تو",
    resultDescription: "سه اثر نزدیک به ترجیحات تو؛ همراه با دلیل انتخاب، نه یک فهرست تصادفی.",
    empty: "با این ترکیب، اثر موجودی پیدا نشد. یک گزینه را آزادتر انتخاب کن یا بودجه را تغییر بده.",
    saveHint: "این انتخاب روی همین دستگاه ذخیره می‌شود تا بعداً بتوانی ادامه بدهی؛ برای خرید هم عضویت اجباری نیست.",
  } : {
    eyebrow: "ELORIA SIGNATURE",
    title: "Find my creation",
    description: "Share a few signals about your taste and story. Eloria finds the closest real, available creations.",
    close: "Close smart guide",
    back: "Back",
    next: "Next",
    find: "Find my creation",
    retry: "Try again",
    resultTitle: "Eloria's picks for you",
    resultDescription: "Three close matches with a reason for each recommendation—not a random list.",
    empty: "No available creation matches this combination. Loosen one preference or change the budget.",
    saveHint: "This selection is saved on this device so you can continue later; membership is not required to purchase.",
  }, [fa]);

  useEffect(() => {
    const openAssistant = () => {
      setOpen(true);
      setStep(0);
      setError(null);
    };
    window.addEventListener("eloria-open-selection", openAssistant);
    return () => window.removeEventListener("eloria-open-selection", openAssistant);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (pathname.includes(`/${locale}/admin`)) return null;

  const requestSelection = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/smart-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, recipient, style, material, collection, budget, clue }),
      });
      const payload = (await response.json()) as ResponsePayload;
      if (!response.ok || !payload.successful) throw new Error(payload.message || (fa ? "انتخاب هوشمند ناموفق بود." : "Smart selection failed."));
      const products = payload.products ?? [];
      setResults(products);
      setStep(4);
      try {
        window.localStorage.setItem("eloria_last_selection", JSON.stringify({ recipient, style, material, collection, budget, clue, savedAt: Date.now() }));
      } catch {}
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (fa ? "خطایی رخ داد." : "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  return open ? (
    <div className="fixed inset-0 z-[100] grid place-items-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={copy.title} dir={fa ? "rtl" : "ltr"}>
      <button type="button" aria-label={copy.close} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <section className="relative flex h-[100svh] w-full max-w-4xl flex-col overflow-hidden border border-[#e6cc79]/35 bg-[radial-gradient(circle_at_50%_0%,rgba(22,101,72,.28),transparent_38%),linear-gradient(145deg,#063425,#01140e_72%)] shadow-[0_35px_130px_rgba(0,0,0,.78),0_0_50px_rgba(216,184,95,.12)] sm:h-auto sm:max-h-[88svh] sm:rounded-[2rem]">
        <div aria-hidden="true" className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#ffdf8b]/80 to-transparent" />
        <header className="relative border-b border-white/[.06] px-5 pb-5 pt-6 sm:px-8 sm:pt-7">
          <button type="button" onClick={() => setOpen(false)} aria-label={copy.close} className="absolute end-5 top-5 grid size-9 place-items-center rounded-full border border-white/10 bg-black/15 text-[#d8c9a8]/70 transition hover:border-[#e6ca76]/40 hover:text-[#f3dda0]">
            <X className="size-4" />
          </button>
          <div className="flex items-center gap-2 text-[#dfc36f]/74">
            <Sparkles className="size-3.5" />
            <span className="text-[9px] font-semibold tracking-[.24em]">{copy.eyebrow}</span>
          </div>
          <h2 className={fa ? "font-persian-title mt-2 pe-12 text-2xl text-[#f6e8c5] sm:text-3xl" : "mt-2 pe-12 font-serif text-3xl text-[#f6e8c5]"}>{copy.title}</h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-[#cbbd9d]/66 sm:text-[13px]">{copy.description}</p>
          <div className="mt-5 flex gap-1.5">
            {[0,1,2,3].map(index => <span key={index} className={`h-1 flex-1 rounded-full ${step >= index ? "bg-[#ddbf68]/72" : "bg-white/[.07]"}`} />)}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
          {step === 0 && (
            <div>
              <p className="mb-4 text-sm text-[#eadfc9]">{fa ? "این اثر برای چه کسی است؟" : "Who is this creation for?"}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectionOption selected={recipient === "self"} onClick={() => setRecipient("self")} icon={<UserRound className="size-5" />} title={fa ? "برای خودم" : "For myself"} subtitle={fa ? "انتخاب بر اساس سلیقه و حس شخصی تو" : "Based on your own taste and mood"} />
                <SelectionOption selected={recipient === "gift"} onClick={() => setRecipient("gift")} icon={<Gift className="size-5" />} title={fa ? "برای هدیه" : "As a gift"} subtitle={fa ? "هدیه‌یاب هوشمند داخل همین تجربه فعال می‌شود" : "Gift-finder logic becomes part of the recommendation"} />
              </div>
              <p className="mb-4 mt-6 text-sm text-[#eadfc9]">{fa ? "حال‌وهوای نزدیک‌تر به تو کدام است؟" : "Which mood feels closest?"}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectionOption selected={style === "delicate"} onClick={() => setStyle("delicate")} title={fa ? "ظریف" : "Delicate"} />
                <SelectionOption selected={style === "classic"} onClick={() => setStyle("classic")} title={fa ? "اصیل" : "Refined"} />
                <SelectionOption selected={style === "mysterious"} onClick={() => setStyle("mysterious")} title={fa ? "رازآلود" : "Mysterious"} />
                <SelectionOption selected={style === "bold"} onClick={() => setStyle("bold")} title={fa ? "جسور" : "Bold"} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="mb-4 text-sm text-[#eadfc9]">{fa ? "جنس و نوع اثر" : "Material and creation type"}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectionOption selected={material === "all"} onClick={() => setMaterial("all")} icon={<Gem className="size-5" />} title={fa ? "فرقی ندارد" : "Either"} />
                <SelectionOption selected={material === "gold"} onClick={() => setMaterial("gold")} title={fa ? "طلا" : "Gold"} />
                <SelectionOption selected={material === "silver"} onClick={() => setMaterial("silver")} title={fa ? "نقره" : "Silver"} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <SelectionOption selected={collection === "all"} onClick={() => setCollection("all")} title={fa ? "انتخاب آزاد" : "Open choice"} />
                <SelectionOption selected={collection === "necklaces"} onClick={() => setCollection("necklaces")} title={fa ? "گردنبند" : "Necklace"} />
                <SelectionOption selected={collection === "bracelets"} onClick={() => setCollection("bracelets")} title={fa ? "دستبند" : "Bracelet"} />
                <SelectionOption selected={collection === "earrings"} onClick={() => setCollection("earrings")} title={fa ? "گوشواره" : "Earrings"} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <label className="block">
                <span className="mb-2 block text-sm text-[#eadfc9]">{fa ? "حداکثر بودجه (اختیاری)" : "Maximum budget (optional)"}</span>
                <div className="relative">
                  <input value={budget} onChange={event => setBudget(digits(event.target.value))} inputMode="numeric" placeholder={fa ? "مثلاً ۳۰٬۰۰۰٬۰۰۰ تومان" : "e.g. 30,000,000 Toman"} className="h-13 w-full rounded-2xl border border-white/[.09] bg-black/15 px-4 text-sm text-[#f4e8cc] outline-none transition placeholder:text-[#aa9c80]/35 focus:border-[#e5c96f]/45" />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-[#eadfc9]">{fa ? "یک نشانه از چیزی که در ذهن داری" : "One clue from what you have in mind"}</span>
                <div className="relative">
                  <Search className="absolute start-4 top-1/2 size-4 -translate-y-1/2 text-[#d8bd6b]/55" />
                  <input value={clue} onChange={event => setClue(event.target.value.slice(0, 60))} placeholder={fa ? "مثلاً: سنگ سبز، بافت تیره، طلایی، هدیه آرام..." : "e.g. green stone, dark weave, golden..."} className="h-13 w-full rounded-2xl border border-white/[.09] bg-black/15 pe-4 ps-11 text-sm text-[#f4e8cc] outline-none transition placeholder:text-[#aa9c80]/35 focus:border-[#e5c96f]/45" />
                </div>
                <span className="mt-2 block text-[11px] leading-5 text-[#b9aa8a]/48">{fa ? "این جست‌وجو محدود به «سنگ سبز» نیست؛ هر واژه‌ای از نام، رنگ، سنگ، توضیح یا روایت ثبت‌شده آثار بررسی می‌شود." : "This is not limited to a preset keyword; it searches names, colors, stones, descriptions and recorded stories."}</span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-[1.6rem] border border-[#d9b85f]/20 bg-[#d9b85f]/[.045] p-5 sm:p-6">
              <Sparkles className="size-7 text-[#e2c56f]" />
              <h3 className="mt-4 text-lg text-[#f2e4c5]">{fa ? "آماده‌ایم داستان تو را با آثار موجود تطبیق دهیم" : "Ready to match your story with available creations"}</h3>
              <p className="mt-2 text-xs leading-7 text-[#c5b798]/62">{fa ? "سیستم ابتدا نشانه‌های دقیق تو را جست‌وجو می‌کند و اگر نتیجه خیلی محدود باشد، بدون حذف جنس، نوع اثر یا سقف بودجه، نزدیک‌ترین گزینه‌های موجود را پیشنهاد می‌دهد." : "The system first uses your precise clues and gracefully broadens only the descriptive match when needed, while keeping material, type and budget constraints."}</p>
              {error ? <p className="mt-4 rounded-xl border border-rose-300/15 bg-rose-900/10 px-4 py-3 text-xs leading-6 text-rose-100/80">{error}</p> : null}
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="text-center">
                <Sparkles className="mx-auto size-6 text-[#e2c56f]" />
                <h3 className={fa ? "font-persian-title mt-2 text-2xl text-[#f4e7c7]" : "mt-2 font-serif text-2xl text-[#f4e7c7]"}>{copy.resultTitle}</h3>
                <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-[#c5b798]/62">{copy.resultDescription}</p>
              </div>
              {results?.length ? (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {results.map(product => {
                    const name = fa ? product.nameFa : product.nameEn;
                    const image = product.image?.imageUrl ?? fallbackImages[product.collectionSlug] ?? "/images/collections/necklaces.webp";
                    const alt = fa ? product.image?.altFa ?? name : product.image?.altEn ?? name;
                    return (
                      <Link key={product.id} href={`/${locale}/products/${product.slug}`} onClick={() => setOpen(false)} className="group overflow-hidden rounded-[1.4rem] border border-white/[.08] bg-black/15 transition hover:-translate-y-1 hover:border-[#e3c66f]/38">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#031811]">
                          <Image src={image} alt={alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#01140e]/80 to-transparent" />
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-[#f1e4c6]">{name}</p>
                          {product.displayPriceToman ? <p className="mt-1 text-xs text-[#dfc673]/78">{Number(product.displayPriceToman).toLocaleString(fa ? "fa-IR" : "en-US")} {fa ? "تومان" : "Toman"}</p> : null}
                          <p className="mt-3 text-[11px] leading-6 text-[#bcae91]/62">{product.reason}</p>
                          {product.matchText ? <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-[#b8aa8d]/48">{product.matchText}</p> : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : <p className="mx-auto mt-7 max-w-xl rounded-2xl border border-white/[.07] bg-white/[.02] px-5 py-5 text-center text-xs leading-7 text-[#d1c3a5]/70">{copy.empty}</p>}
              <p className="mx-auto mt-5 max-w-2xl text-center text-[10px] leading-5 text-[#aa9c80]/44">{copy.saveHint}</p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white/[.06] px-5 py-4 sm:px-8">
          {step > 0 && step < 4 ? (
            <button type="button" onClick={() => setStep(current => Math.max(0, current - 1))} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/[.09] px-4 text-xs text-[#d2c3a2]/70 transition hover:border-[#d9b85f]/30 hover:text-[#ecd793]">
              {fa ? <ArrowRight className="size-3.5" /> : <ArrowLeft className="size-3.5" />}{copy.back}
            </button>
          ) : <span />}
          {step < 3 ? (
            <button type="button" onClick={() => setStep(current => current + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e1c46e]/45 bg-[#d9b85f]/[.09] px-5 text-xs text-[#f0d98f] transition hover:border-[#f0d784]/70 hover:bg-[#d9b85f]/[.14]">
              {copy.next}{fa ? <ArrowLeft className="size-3.5" /> : <ArrowRight className="size-3.5" />}
            </button>
          ) : step === 3 ? (
            <button type="button" disabled={loading} onClick={requestSelection} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e1c46e]/55 bg-[#d9b85f]/[.12] px-5 text-xs text-[#f3dd98] transition hover:border-[#f0d784]/78 disabled:cursor-wait disabled:opacity-55">
              <Sparkles className="size-3.5" />{loading ? (fa ? "در حال انتخاب..." : "Selecting...") : copy.find}
            </button>
          ) : (
            <button type="button" onClick={() => { setResults(null); setError(null); setStep(0); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e1c46e]/40 bg-[#d9b85f]/[.07] px-5 text-xs text-[#ecd793]">
              {copy.retry}
            </button>
          )}
        </footer>
      </section>
    </div>
  ) : null;
}
