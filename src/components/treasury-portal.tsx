"use client";

import Image from "next/image";
import { useId, useState } from "react";
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
    fetchPriority={active ? "high" : "auto"} className="treasury-product-photo"
    onError={() => cutout ? setCutoutFailed(true) : setFailed(true)} />;
}

export function TreasuryPortal({ treasury, piece, locale, prefetch }: {
  treasury: Treasury; piece?: HomePiece; locale: "fa" | "en"; prefetch: boolean;
}) {
  const [open, setOpen] = useState(false);
  const id = `treasury-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const fa = locale === "fa";
  const name = fa ? treasury.fa : treasury.en;
  return <article className={`portal ${treasury.key}${open ? " is-open" : ""}`}
    onPointerEnter={event => { if (event.pointerType === "mouse") setOpen(true); }}
    onPointerLeave={event => { if (event.pointerType === "mouse") setOpen(false); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
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
        aria-label={fa ? `${open ? "بستن" : "باز کردن"} دروازهٔ ${name} و پیش‌نمایش اثر` : `${open ? "Close" : "Open"} ${name} gate and product preview`}
        onClick={() => setOpen(value => !value)} />
    </div>
    <div className="portal-content">
      <span className="portal-kicker">{fa ? "مجموعهٔ الوریا" : "THE ELORIA COLLECTION"}</span>
      <h3>{fa ? `گنجینهٔ ${name}` : `${name} treasury`}</h3>
      <p>{fa ? treasury.tagline : treasury.english}</p>
      <TreasuryLink prefetch={prefetch} className="portal-cta" href={`/${locale}/collections/${treasury.key}`}
        aria-label={fa ? `ورود به گنجینهٔ ${name}` : `Enter the ${name} treasury`}>
        {fa ? "ورود به گنجینه" : "Enter the treasury"}
      </TreasuryLink>
    </div>
  </article>;
}
