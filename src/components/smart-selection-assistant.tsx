"use client";

import {
  Check,
  CircleDollarSign,
  Gem,
  Sparkles,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CollectionChoice = "necklaces" | "bracelets" | "earrings";
type MaterialChoice = "gold" | "silver" | "all";

function digits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^\d]/g, "")
    .slice(0, 15);
}

export function SmartSelectionAssistant({ locale }: { locale: "fa" | "en" }) {
  const pathname = usePathname() ?? `/${locale}`;
  const router = useRouter();
  const fa = locale === "fa";
  const [open, setOpen] = useState(false);
  const [collection, setCollection] = useState<CollectionChoice>("necklaces");
  const [material, setMaterial] = useState<MaterialChoice>("gold");
  const [budget, setBudget] = useState("");

  const copy = useMemo(
    () =>
      fa
        ? {
            title: "راهنمای انتخاب الوریا",
            description: "چند انتخاب کوتاه انجام دهید تا نزدیک‌ترین آثار الوریا به سلیقه و بودجه شما نمایش داده شوند.",
            category: "چه نوع اثری می‌خواهید؟",
            material: "جنس مورد علاقه",
            budget: "حداکثر بودجه (تومان، اختیاری)",
            show: "نمایش انتخاب‌های مناسب",
            close: "بستن راهنمای انتخاب",
            neck: "گردنبند",
            bracelet: "دستبند",
            earrings: "گوشواره",
            gold: "طلا",
            silver: "نقره",
            all: "فرقی ندارد",
          }
        : {
            title: "Eloria selection guide",
            description: "Choose a few preferences and discover the Eloria creations closest to your style and budget.",
            category: "What are you looking for?",
            material: "Preferred material",
            budget: "Maximum budget (Toman, optional)",
            show: "Show matching creations",
            close: "Close selection guide",
            neck: "Necklace",
            bracelet: "Bracelet",
            earrings: "Earrings",
            gold: "Gold",
            silver: "Silver",
            all: "Either material",
          },
    [fa],
  );

  useEffect(() => {
    const openAssistant = () => setOpen(true);
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

  const select = () => {
    const params = new URLSearchParams({ collection, availability: "available" });
    if (material !== "all") params.set("material", material);
    if (budget) params.set("maxPrice", budget);
    setOpen(false);
    router.push(`/${locale}/products?${params.toString()}`);
  };

  return open ? (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={copy.title} dir={fa ? "rtl" : "ltr"}>
      <button type="button" aria-label={copy.close} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/72 backdrop-blur-sm" />
      <section className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#e6cc79]/38 bg-[linear-gradient(145deg,rgba(6,52,37,.99),rgba(1,20,14,.99))] p-5 shadow-[0_35px_110px_rgba(0,0,0,.68),0_0_45px_rgba(216,184,95,.12)] sm:p-7">
        <div aria-hidden="true" className="absolute inset-x-14 top-0 h-px bg-gradient-to-r from-transparent via-[#ffdf8b]/80 to-transparent" />
        <button type="button" onClick={() => setOpen(false)} aria-label={copy.close} className="absolute end-5 top-5 grid size-9 place-items-center rounded-full border border-white/10 text-[#d7c7a4] transition hover:border-[#e7ca76]/45 hover:text-[#f1da90]">
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3 pe-10">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#e7ca76]/26 bg-[#d8b967]/[.09] text-[#f0d887]"><Sparkles className="size-5" /></span>
          <div>
            <p className="text-[10px] uppercase tracking-[.22em] text-[#e4c974]/65">Eloria curator</p>
            <h2 className="mt-2 text-xl font-medium text-[#f4e7c8]">{copy.title}</h2>
          </div>
        </div>
        <p className="mt-5 text-sm leading-8 text-[#d2c3a1]/66">{copy.description}</p>

        <fieldset className="mt-6">
          <legend className="text-xs text-[#ead797]">{copy.category}</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([
              ["necklaces", copy.neck],
              ["bracelets", copy.bracelet],
              ["earrings", copy.earrings],
            ] as Array<[CollectionChoice, string]>).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setCollection(value)} className={`min-h-16 rounded-2xl border px-2 text-xs transition ${collection === value ? "border-[#ebcf7b]/58 bg-[#d8b967]/[.13] text-[#f5dfa1]" : "border-white/[.08] bg-black/12 text-[#d4c4a1]/66 hover:border-[#e4c775]/30"}`}>
                <Gem className="mx-auto mb-1.5 size-4" />
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-xs text-[#ead797]">{copy.material}</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([
              ["gold", copy.gold],
              ["silver", copy.silver],
              ["all", copy.all],
            ] as Array<[MaterialChoice, string]>).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setMaterial(value)} className={`min-h-11 rounded-xl border px-2 text-xs transition ${material === value ? "border-[#ebcf7b]/58 bg-[#d8b967]/[.13] text-[#f5dfa1]" : "border-white/[.08] bg-black/12 text-[#d4c4a1]/66 hover:border-[#e4c775]/30"}`}>{label}</button>
            ))}
          </div>
        </fieldset>

        <label className="mt-6 block text-xs text-[#ead797]">
          {copy.budget}
          <span className="relative mt-3 block">
            <CircleDollarSign className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#d9bb68]/55" />
            <input value={budget} onChange={(event) => setBudget(digits(event.target.value))} inputMode="numeric" placeholder={fa ? "مثلاً ۵۰۰۰۰۰۰۰" : "e.g. 50000000"} className="w-full rounded-xl border border-white/[.09] bg-black/15 py-3 pe-3 ps-10 text-sm text-[#f0e1c3] outline-none placeholder:text-white/28 focus:border-[#e4c775]/42" />
          </span>
        </label>

        <button type="button" onClick={select} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#eed27c]/55 bg-[linear-gradient(105deg,rgba(184,143,49,.36),rgba(21,109,76,.38))] px-5 text-sm text-[#f8e4a4] transition hover:border-[#f5da8a]/80 hover:brightness-110">
          <Check className="size-4" />
          {copy.show}
        </button>
      </section>
    </div>
  ) : null;
}
