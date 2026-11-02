"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { TreasuryLink } from "@/components/treasury-transition";
import { ReferenceTreasuryGate } from "@/components/reference-treasury-gate";
import { localMediaLoader } from "@/lib/local-media-loader";
import type { GateTreasury } from "@/lib/reference-treasury-gate";
import type { HomePiece } from "@/lib/home-design-data";

type Treasury = { key: GateTreasury; fa: string; en: string; tagline: string; english: string };

function TreasuryPhoto({ piece, locale, active }: { piece?: HomePiece; locale: string; active: boolean }) {
  const [cutoutFailed, setCutoutFailed] = useState(false);
  const [failed, setFailed] = useState(false);
  const cutout = Boolean(piece?.cutoutUrl && !cutoutFailed);
  const source = cutout ? piece!.cutoutUrl! : piece?.imageUrl;
  if (!source || failed) return <span className="treasury-photo-unavailable">
    {locale === "fa" ? "آثار این گنجینه را ببینید" : "Explore this treasury"}
  </span>;
  return <Image src={source} alt={piece!.name} fill sizes="(max-width:760px) 40vw, 26vw"
    loader={localMediaLoader(source)} loading={active ? "eager" : "lazy"}
    fetchPriority={active ? "high" : "auto"} decoding="async"
    className={`treasury-product-photo${cutout ? " is-cutout" : ""}`}
    onError={() => cutout ? setCutoutFailed(true) : setFailed(true)} />;
}

// One owner for the whole row: the viewport midpoint can belong to only one gate.
export function useMobileTreasury() {
  const grid = useRef<HTMLDivElement>(null);
  // undefined delegates interaction to desktop hover and keyboard controls.
  const [active, setActive] = useState<GateTreasury | null | undefined>(undefined);
  useEffect(() => {
    const row = grid.current;
    if (!row) return;
    const media = window.matchMedia("(max-width: 760px)");
    const cards = Array.from(row.querySelectorAll<HTMLElement>("[data-treasury]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      const card = cards.find(element => {
        const { top, bottom } = element.getBoundingClientRect();
        return top <= middle && middle < bottom;
      });
      setActive(card ? card.dataset.treasury as GateTreasury : null);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const detach = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const sync = () => {
      detach();
      if (!media.matches) { setActive(undefined); return; }
      update();
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
    };
    sync();
    media.addEventListener("change", sync);
    return () => { detach(); media.removeEventListener("change", sync); };
  }, []);
  return { grid, active, setActive };
}

export function TreasuryPortal({ treasury, piece, locale, prefetch, mobileActive, onMobileChange }: {
  treasury: Treasury; piece?: HomePiece; locale: "fa" | "en"; prefetch: boolean;
  mobileActive?: GateTreasury | null; onMobileChange?: (value: GateTreasury | null) => void;
}) {
  // A mouse hover previews temporarily; a tap/click is an explicit choice.
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const mobile = mobileActive !== undefined;
  const open = mobile ? mobileActive === treasury.key : expanded ?? hovered;
  const id = `treasury-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const fa = locale === "fa";
  const name = fa ? treasury.fa : treasury.en;
  const toggle = () => {
    if (mobile) onMobileChange?.(open ? null : treasury.key);
    else setExpanded(value => value !== true);
  };
  const toggleLabel = fa ? `${open ? "بستن" : "باز کردن"} دروازهٔ ${name} و پیش‌نمایش اثر` : `${open ? "Close" : "Open"} ${name} gate and product preview`;
  return <article data-treasury={treasury.key} className={`portal ${treasury.key}${open ? " is-open" : ""}`}
    onClick={event => {
      // A click is emitted only after a tap, never while scrolling the page.
      if (window.matchMedia("(max-width: 760px)").matches &&
          !(event.target as Element).closest("a, button")) toggle();
    }}
    onPointerEnter={event => {
      if (event.pointerType === "mouse") {
        setHovered(true);
        setExpanded(value => value === false ? null : value);
      }
    }}
    onPointerLeave={event => {
      if (event.pointerType === "mouse") {
        setHovered(false);
        setExpanded(value => value === false ? null : value);
      }
    }}
    onKeyDown={event => { if (event.key === "Escape") { if (mobile) onMobileChange?.(null); setHovered(false); setExpanded(false); } }}>
    <div className="portal-window">
      <div className="portal-frame" aria-hidden="true" />
      <div className="portal-preview" id={`${id}-photo`} aria-hidden={!open}>
        <div className="portal-image">
          <TreasuryPhoto key={`${piece?.imageUrl ?? "empty"}:${piece?.cutoutUrl ?? ""}`} piece={piece} locale={locale} active={open} />
        </div>
      </div>
      <div className="portal-shutters" aria-hidden="true">
        <div className="door door-right" /><div className="door door-left" />
      </div>
      <ReferenceTreasuryGate treasury={treasury.key} />
      <button type="button" className="portal-gate-toggle" aria-expanded={open} aria-controls={`${id}-photo`}
        aria-label={toggleLabel}
        onClick={toggle}>
        <span className="portal-toggle-label" aria-hidden="true">
          {fa ? (open ? "بستن دریچه" : "باز کردن دریچه") : (open ? "Close window" : "Open window")}
        </span>
      </button>
    </div>
    <div className="portal-content">
      <span className="portal-kicker">{fa ? "مجموعهٔ الوریا" : "THE ELORIA COLLECTION"}</span>
      <h3>{fa ? `گنجینهٔ ${name}` : `${name} treasury`}</h3>
      <p>{fa ? treasury.tagline : treasury.english}</p>
      <button type="button" className="portal-cta portal-mobile-toggle" onClick={toggle}
        aria-expanded={open} aria-controls={`${id}-photo`} aria-label={toggleLabel}>
        {fa ? `گنجینهٔ ${name}` : `${name} treasury`}
      </button>
      <TreasuryLink prefetch={prefetch && open} className="portal-cta portal-entry" href={`/${locale}/collections/${treasury.key}`}
        aria-label={fa ? `ورود به گنجینهٔ ${name}` : `Enter the ${name} treasury`}>
        {fa ? "ورود به گنجینه" : "Enter the treasury"}
      </TreasuryLink>
    </div>
  </article>;
}
