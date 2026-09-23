"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { TreasuryLink } from "@/components/treasury-transition";
import { ProductCardLivePrice } from "@/components/product-card-live-price";
import { LivePurchaseBox } from "@/components/live-purchase-box";
import type { CatalogProduct } from "@/lib/catalog";

export function TreasuryProductSalon({ products, locale }: { products: CatalogProduct[]; locale: string }) {
  const fa = locale === "fa";
  const [selected, setSelected] = useState(0);
  const [quick, setQuick] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const product = products[selected];
  if (!product) return null;
  function select(index: number) {
    setSelected(index);
    const slide = rail.current?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest", inline: "center" });
  }
  const name = (item: CatalogProduct) => fa ? item.nameFa : item.nameEn;
  const picture = (item: CatalogProduct) => item.image?.imageUrl ?? "/images/collections/necklaces.webp";
  return <section className="eloria-product-salon" aria-label={fa ? "آثار گنجینه" : "Treasury creations"}>
    <div ref={rail} className="eloria-salon-rail" onScroll={() => {
      const element = rail.current;
      if (!element) return;
      const center = element.getBoundingClientRect().left + element.clientWidth / 2;
      let nearest = 0; let distance = Infinity;
      Array.from(element.children).forEach((child, i) => { const r = child.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - center); if (d < distance) { distance = d; nearest = i; } });
      setSelected(nearest);
    }}>
      {products.map((item, index) => <article key={item.id} className="eloria-salon-piece" aria-label={name(item)}>
        <TreasuryLink direction="up" href={`/${locale}/products/${item.slug}`} className="eloria-salon-image">
          <Image src={picture(item)} alt={name(item)} fill sizes="(max-width:640px) 86vw, 52vw" loading={index < 2 ? "eager" : "lazy"} className="object-contain" />
        </TreasuryLink>
        <h2 className={fa ? "font-persian-title" : "font-serif"}><TreasuryLink direction="up" href={`/${locale}/products/${item.slug}`}>{name(item)}</TreasuryLink></h2>
        {index === selected ? <ProductCardLivePrice slug={item.slug} locale={locale} initialPriceToman={item.displayPriceToman} /> : <p className="text-xs text-[#ddcba4]">{item.displayPriceToman ? `${BigInt(item.displayPriceToman).toLocaleString(fa ? "fa-IR" : "en-US")} ${fa ? "تومان" : "toman"}` : "—"}</p>}
        <button type="button" className="eloria-quick-button" onClick={event => { trigger.current = event.currentTarget; setSelected(index); setQuick(true); dialog.current?.showModal(); }}>{fa ? item.isAvailable ? "خرید سریع" : "مشاهده وضعیت" : "Quick shop"}</button>
      </article>)}
    </div>
    <div className="eloria-salon-controls">
      <button type="button" disabled={selected === 0} onClick={() => select(selected - 1)} aria-label={fa ? "اثر قبلی" : "Previous creation"}>→</button>
      <span aria-live="polite">{(selected + 1).toLocaleString(fa ? "fa-IR" : "en-US")} / {products.length.toLocaleString(fa ? "fa-IR" : "en-US")}</span>
      <button type="button" disabled={selected === products.length - 1} onClick={() => select(selected + 1)} aria-label={fa ? "اثر بعدی" : "Next creation"}>←</button>
    </div>
    <nav className="eloria-salon-thumbnails" aria-label={fa ? "انتخاب اثر" : "Choose a creation"}>{products.map((item, index) => <button key={item.id} type="button" aria-label={name(item)} aria-pressed={index === selected} onClick={() => select(index)}><Image src={picture(item)} alt="" fill sizes="52px" className="object-cover" /></button>)}</nav>
    <dialog ref={dialog} className="eloria-quick-dialog" aria-label={fa ? `خرید ${name(product)}` : `Shop ${name(product)}`} onClose={() => { setQuick(false); trigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="eloria-quick-content"><button type="button" autoFocus className="eloria-dialog-close" aria-label={fa ? "بستن" : "Close"} onClick={() => dialog.current?.close()}>×</button>
        <h2 className="mb-4 text-xl">{name(product)}</h2>
        {quick && <LivePurchaseBox key={product.slug} slug={product.slug} locale={locale} />}
        <TreasuryLink className="mt-5 block text-center text-xs" href={`/${locale}/products/${product.slug}`} direction="up" onClick={() => dialog.current?.close()}>{fa ? "مشخصات کامل و انتخاب مدل" : "Full details and options"} ↗</TreasuryLink>
      </div>
    </dialog>
  </section>;
}
