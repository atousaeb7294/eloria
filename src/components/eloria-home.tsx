"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CartHeaderButton } from "@/components/cart-header-button";
import { CustomerAccountHeaderButton } from "@/components/customer-account-header-button";
import { ProductImage } from "@/components/product-image";
import { ProductCardLivePrice } from "@/components/product-card-live-price";
import { CircularProductImage } from "@/components/circular-product-image";
import { TreasuryLink } from "@/components/treasury-transition";
import { FloatingProductImage } from "@/components/floating-product-image";
import { useIntroComplete } from "@/components/intro/use-intro-complete";
import { Menu, Pause, Play, ShoppingBag, X } from "lucide-react";
import { EloriaKnotIcon, EloriaJewelIcon, EloriaPortalIcon } from "@/components/eloria-icons";
import { GoldRuneIcon, SilverRuneIcon, WeaveRuneIcon } from "@/components/material-rune-icons";
import type { HomeDesign, HomePiece } from "@/lib/home-design";

const subscribeMotion = (cb: () => void) => {
  const q = window.matchMedia("(prefers-reduced-motion: reduce)");
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};
const readMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotion = () => true;
const treasuries = [
  {
    key: "gold",
    Icon: GoldRuneIcon,
    fa: "طلا",
    en: "Gold",
    tagline: "درخشش گرم، در گره‌های ماندگار",
    english: "A warm glow in enduring knots",
  },
  {
    key: "silver",
    Icon: SilverRuneIcon,
    fa: "نقره",
    en: "Silver",
    tagline: "روشن، آرام، همراه هر روز",
    english: "Quiet brilliance, every day",
  },
  {
    key: "weave",
    Icon: WeaveRuneIcon,
    fa: "بافت",
    en: "Weave",
    tagline: "رنگ و گره، با امضای دست",
    english: "Color and knots, made by hand",
  },
] as const;

export function EloriaHome({
  locale,
  design,
}: {
  locale: "fa" | "en";
  design: HomeDesign;
}) {
  const fa = locale === "fa";
  const [menu, setMenu] = useState(false);
  const [paused, setPaused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [quick, setQuick] = useState<HomePiece | null>(null);
  const [featuredVisible, setFeaturedVisible] = useState(false);
  const featured = useRef<HTMLElement>(null);
  const introComplete = useIntroComplete();
  const reduced = useSyncExternalStore(
    subscribeMotion,
    readMotion,
    serverMotion,
  );
  const stop = paused || reduced || offscreen || hidden || !introComplete;
  const stage = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const hero = design.hero;
  const [heroReady, setHeroReady] = useState(false);
  // Let the hero and intro use the connection first; pointer/focus intent still
  // prefetches immediately through the shared NavigationAccelerator.
  const warmRoutes = introComplete && (!hero?.cutoutUrl || heroReady);
  const links = [
    { href: "#treasuries", label: fa ? "گنجینه‌ها" : "Treasuries" },
    { href: "#featured", label: fa ? "منتخب‌ها" : "The edit" },
    { href: "#story", label: fa ? "داستان الوریا" : "Our story" },
  ];
  function open(piece: HomePiece, element: HTMLElement) {
    trigger.current = element;
    setQuick(piece);
  }
  useEffect(() => {
    if (!featured.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setFeaturedVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "250px" });
    observer.observe(featured.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) =>
      setOffscreen(!entries[0].isIntersecting),
    );
    observer.observe(element);
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    const modal = dialog.current;
    if (!quick || !modal) return;
    const overflow = document.body.style.overflow;
    modal.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      modal.close();
      document.body.style.overflow = overflow;
      trigger.current?.focus({ preventScroll: true });
    };
  }, [quick]);
  return (
    <div
      className={`eloria-home${stop ? " paused" : ""}`}
      dir={fa ? "rtl" : "ltr"}
    >
      <div className="palace" aria-hidden="true" />
      <div className="atmosphere" aria-hidden="true" />
      <header className="home-header home-header-refined">
        <div className="home-header-note">{fa ? "بافته از مهر · آراسته به طلا و نقره" : "Woven with care · Adorned in gold & silver"}</div>
        <div className="home-header-inner">
        <TreasuryLink href={`/${locale}`} className="brand">
          <Image
            className="brand-logo"
            src="/images/brand/eloria-logo.webp"
            alt={fa ? "لوگوی الوریا" : "Eloria"}
            width={76}
            height={76}
            priority
          />
          <span className="brand-wordmark">
            ELORIA
            <small>
              {fa ? "جواهری در دل افسانه" : "A jewel within a legend"}
            </small>
          </span>
          <Image className="brand-script" src="/images/brand/eloria-script-gold-v3.webp"
            alt="ELORIA" width={520} height={192} unoptimized />
        </TreasuryLink>
        <nav
          id="home-menu"
          className={menu ? "open" : ""}
          aria-label={fa ? "منوی اصلی" : "Main navigation"}
        >
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMenu(false)}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="home-account">
          <TreasuryLink className="home-language" href={fa ? "/en" : "/fa"} lang={fa ? "en" : "fa"}>{fa ? "EN" : "فا"}</TreasuryLink>
          <CustomerAccountHeaderButton locale={locale} />
          <CartHeaderButton locale={locale} variant="compact" />
        <button
          type="button"
          className="menu"
          aria-controls="home-menu"
          aria-expanded={menu}
          aria-label={fa ? "منوی سایت" : "Site menu"}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
        </button>
        </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="hero" id="hero">
          <span id="home" className="home-anchor" />
          <div className="hero-copy">
            <div className="eyebrow">
              <i />
              {fa ? "هنرِ همراه شدن" : "THE ART OF BELONGING"}
            </div>
            <h1>
              {fa ? (
                <>
                  <span className="hero-title-line">هر اثر،</span>
                  <span className="hero-title-line">روایتی <em>ماندگار</em></span>
                </>
              ) : (
                <>
                  Every piece,
                  <br />a lasting <em>story.</em>
                </>
              )}
            </h1>
            <p>
              {fa ? (
                <>
                  بافته از مهر، آراسته به طلا و نقره.
                  <br />
                  از جهان الوریا، برای داستان تو.
                </>
              ) : (
                <>
                  Woven with care, adorned in gold and silver.
                  <br />
                  From Eloria, for your story.
                </>
              )}
            </p>
            <div className="hero-actions">
              <a className="eloria-cta eloria-cta-primary" href="#treasuries">
                <span>{fa ? "ورود به گنجینه‌ها" : "Enter the treasuries"}</span>
              </a>
              <TreasuryLink prefetch={warmRoutes} direction="up" className="eloria-cta eloria-cta-secondary" href={`/${locale}/products`}>
                <span>{fa ? "دیدن همهٔ آثار" : "View all creations"}</span>
              </TreasuryLink>
            </div>
            <div className="signature">
              <EloriaKnotIcon size={20} />
              <span>
                {fa
                  ? "زیورآلات دست‌ساز با روح ایران"
                  : "Handcrafted jewelry with a Persian soul"}
              </span>
            </div>
          </div>
          <div
            className="showcase"
            ref={stage}
          >
            <div className="stage-label">
              <span>THE ELORIA ATELIER</span>
              <span>{hero?.name}</span>
            </div>
            {hero ? (
              <>
                <div className="hero-photo-wrap">
                  <FloatingProductImage
                    src={hero.imageUrl}
                    cutoutSrc={hero.cutoutUrl}
                    imageId={hero.imageId}
                    alt={hero.name}
                    scale={hero.scale}
                    paused={stop}
                    priority
                    onReady={() => setHeroReady(true)}
                    sizes="(max-width:520px) 92vw, (max-width:760px) 460px, (max-width:1440px) 48vw, 690px"
                  />
                </div>
                <div className="photo-caption">
                  <span>
                    {fa ? "از آثار واقعی الوریا" : "An original Eloria piece"}
                  </span>
                  <h2>{hero.name}</h2>
                  <button
                    type="button"
                    className="text-link"
                    onClick={(e) => open(hero, e.currentTarget)}
                  >
                    {fa ? "از نزدیک ببین" : "A closer look"}
                  </button>
                </div>
                <button
                  type="button"
                  className="motion"
                  disabled={reduced}
                  aria-label={
                    fa
                      ? paused
                        ? "شروع حرکت"
                        : "توقف حرکت"
                      : paused
                        ? "Resume motion"
                        : "Pause motion"
                  }
                  aria-pressed={paused || reduced}
                  onClick={() => setPaused(!paused)}
                >
                  {paused || reduced ? <Play size={18} /> : <Pause size={18} />}
                </button>
              </>
            ) : (
              <div className="hero-unavailable">
                <EloriaKnotIcon size={64} />
                <p>
                  {fa
                    ? "هر گنجینه، آغاز یک داستان"
                    : "Every treasury begins a story"}
                </p>
                <a className="text-link" href="#treasuries">
                  {fa ? "کشف گنجینه‌ها" : "Explore the treasuries"}
                </a>
              </div>
            )}
          </div>
          <div className="hero-bottom">
            <span>
              {fa ? "بافت · طلا · نقره · سنگ" : "WEAVE · GOLD · SILVER · STONE"}
            </span>
            <a href="#treasuries">
              {fa ? "سه گنجینه، سه جهان" : "Three treasuries, three worlds"}{" "}

            </a>
            <small>HANDCRAFTED / ELORIA</small>
          </div>
        </section>
        <section className="treasuries section" id="treasuries">
          <div className="section-heading">
            <div>
              <div className="eyebrow">ENTER A TREASURY</div>
              <h2>
                {fa ? "کدام جهان، شبیه توست؟" : "Which world feels like you?"}
              </h2>
            </div>
            <p>
              {fa
                ? "یک گنجینه را انتخاب کن؛ آثارش در انتظار تو هستند."
                : "Choose a treasury. Its pieces await you."}
            </p>
          </div>
          <div className="portal-grid">
            {treasuries.map((t, i) => (
              <TreasuryLink prefetch={warmRoutes}
                className={`portal ${t.key}`}
                key={t.key}
                href={`/${locale}/collections/${t.key}`}
                aria-label={
                  fa ? `ورود به گنجینهٔ ${t.fa}` : `Enter the ${t.en} treasury`
                }
              >
                <div className="portal-window">
                  <div className="portal-halo" />
                  <div className="portal-preview" aria-hidden="true">
                    {design.pieces
                      .filter((p) => p.group === t.key)
                      .slice(0, 1)
                      .map((p) => (
                        <div className="portal-image" key={p.id}>
                          <CircularProductImage
                            src={p.imageUrl}
                            cutoutSrc={p.cutoutUrl}
                            imageId={p.imageId}
                            alt=""
                            sizes="(max-width:760px) 40vw, 32vw"
                          />
                        </div>
                      ))}
                  </div>
                  <div className="door door-right" />
                  <div className="door door-left" />
                  <span className="portal-glyph" aria-hidden="true">
                    <t.Icon className="size-12" />
                  </span>
                  <span className="portal-seal-mark" aria-hidden="true">
                    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M16 3c5 0 5 7 5 8s8-1 8 5-7 5-8 5 1 8-5 8-5-7-5-8-8 1-8-5 7-5 8-5-1-8 5-8Z" />
                      <path d="m16 6 10 10-10 10L6 16 16 6Zm0 5 5 5-5 5-5-5 5-5Z" />
                    </svg>
                  </span>
                  <span className="portal-index">0{i + 1}</span>
                </div>
                <div className="portal-content">
                  <span className="portal-kicker">
                    {fa ? "مجموعهٔ الوریا" : "THE ELORIA COLLECTION"}
                  </span>
                  <h3>{fa ? `گنجینهٔ ${t.fa}` : `${t.en} treasury`}</h3>
                  <p>{fa ? t.tagline : t.english}</p>
                  <span className="portal-cta">
                    {fa ? "ورود به گنجینه" : "Enter the treasury"}{" "}

                  </span>
                </div>
              </TreasuryLink>
            ))}
          </div>
        </section>
        <section className="featured section" id="featured" ref={featured}>
          <div className="section-heading">
            <div>
              <div className="eyebrow">THE CURATED EDIT</div>
              <h2>{fa ? "منتخب‌های الوریا" : "The Eloria edit"}</h2>
            </div>
            <p>
              {fa
                ? "انتخاب‌هایی از جهان الوریا"
                : "Selected from the world of Eloria"}
            </p>
          </div>
          <div className="selected-grid">
            {design.pieces.slice(0, 8).map((p, i) => (
              <article className="product-card medallion" key={p.id}>
                <button
                  type="button"
                  className="product-open"
                  aria-label={
                    fa ? `نگاه سریع به ${p.name}` : `Quick view: ${p.name}`
                  }
                  onClick={(e) => open(p, e.currentTarget)}
                >
                  <div className="product-photo">
                    <span className="frame-star" aria-hidden="true">
                      <EloriaJewelIcon size={20} />
                    </span>
                    <div
                      className={`image-seat${p.cutoutUrl ? " is-cutout" : ""}`}
                    >
                      <CircularProductImage
                        src={p.imageUrl}
                        cutoutSrc={p.cutoutUrl}
                        imageId={p.imageId}
                        alt={p.name}
                        sizes="(max-width:760px) 42vw, (max-width:1100px) 28vw, 300px"
                      />
                    </div>
                    <span className="piece-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                </button>
                <div className="product-description">
                  <div>
                    <small>
                      {fa
                        ? `گنجینهٔ ${treasuries.find((t) => t.key === p.group)?.fa}`
                        : `${p.group} treasury`}
                    </small>
                    <h3>
                      <TreasuryLink href={`/${locale}/products/${p.slug}`}>
                        {p.name}
                      </TreasuryLink>
                    </h3>
                    <div className="home-price">
                      <ProductCardLivePrice
                        slug={p.slug}
                        locale={locale}
                        compact
                        enabled={introComplete && featuredVisible}
                      />
                    </div>
                  </div>
                  <TreasuryLink prefetch={true}
                    className="home-details-link"
                    href={`/${locale}/products/${p.slug}`}
                    aria-label={fa ? `جزئیات ${p.name}` : `Details: ${p.name}`}
                  >
                    {fa ? "جزئیات" : "Details"}
                  </TreasuryLink>
                </div>
                <button
                  type="button"
                  className="quick-view-label"
                  onClick={(e) => open(p, e.currentTarget)}
                  aria-label={
                    fa ? `نگاه سریع به ${p.name}` : `Quick view: ${p.name}`
                  }
                >
                  {fa ? "نگاه سریع" : "Quick view"}

                </button>
              </article>
            ))}
          </div>
          {!design.pieces.length && (
            <p className="home-empty" role="status">
              {fa
                ? "منتخب‌ها فعلاً در دسترس نیستند؛ می‌توانید وارد گنجینه‌ها شوید."
                : "The edit is temporarily unavailable. Explore the treasuries."}
            </p>
          )}
        </section>
        <section id="story" className="story section">
          <div className="story-symbol" aria-hidden="true">
            <EloriaKnotIcon size={60} />
          </div>
          <div className="eyebrow">A STORY IN EVERY KNOT</div>
          <h2>
            {fa ? "از یک گره، تا یک یادگار" : "From a knot to a keepsake"}
          </h2>
          <p>
            {fa ? (
              <>
                بافت دست‌ساز، طلا، نقره و سنگ؛
                <br />
                جزئیاتی که به سلیقه و خاطرهٔ تو پیوند می‌خورند.
              </>
            ) : (
              "Handwoven details, gold, silver and stone. A connection to your taste and memories."
            )}
          </p>
          <TreasuryLink className="text-link" href={`/${locale}/story`}>
            {fa ? "داستان الوریا را بخوان" : "Read our story"}
          </TreasuryLink>
        </section>
      </main>
      <div
        className="mobile-nav"
        aria-label={fa ? "دسترسی سریع" : "Quick navigation"}
      >
        <a href="#hero">
          <EloriaPortalIcon size={22} />
          {fa ? "آغاز" : "Home"}
        </a>
        <a href="#treasuries">
          <EloriaJewelIcon size={22} />
          {fa ? "گنجینه‌ها" : "Treasuries"}
        </a>
        <a href="#featured">
          <EloriaKnotIcon size={22} />
          {fa ? "منتخب‌ها" : "The edit"}
        </a>
        <TreasuryLink href={`/${locale}/cart`}>
          <ShoppingBag aria-hidden="true" size={22} />
          {fa ? "سبد خرید" : "Bag"}
        </TreasuryLink>
      </div>
      <dialog
        ref={dialog}
        className="home-quick-dialog"
        aria-labelledby="home-dialog-title"
        onCancel={() => setQuick(null)}
        onClose={() => setQuick(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              setQuick(null);
          }
        }}
      >
        <button
          type="button"
          className="close-dialog"
          aria-label={fa ? "بستن" : "Close"}
          onClick={() => setQuick(null)}
        >
          <X aria-hidden="true" size={22} />
        </button>
        {quick && (
          <div className="dialog-layout">
            <div className="dialog-photo">
              <ProductImage
                src={quick.imageUrl}
                alt={quick.name}
                fill
                sizes="(max-width:760px) 90vw, 450px"
              />
            </div>
            <div className="dialog-copy">
              <div className="eyebrow">ELORIA / THE CURATED EDIT</div>
              <h2 id="home-dialog-title">{quick.name}</h2>
              <div className="home-price">
                <ProductCardLivePrice slug={quick.slug} locale={locale} />
              </div>
              <p>
                {fa
                  ? "جزئیات بافت و رنگ را در عکس اصلی اثر ببین."
                  : "See the details in the original photograph."}
              </p>
              <TreasuryLink prefetch={true}
                className="button"
                href={`/${locale}/products/${quick.slug}`}
                onNavigate={() => setQuick(null)}
              >
                {fa ? "جزئیات و خرید" : "Details & purchase"}
              </TreasuryLink>
              <small>
                {fa
                  ? "قیمت و موجودی نهایی هنگام خرید بررسی می‌شود."
                  : "Final price and availability are checked at purchase."}
              </small>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
