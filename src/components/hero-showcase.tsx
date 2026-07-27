export function HeroShowcase() {
    return (
      <section className="relative min-h-screen overflow-hidden bg-[#02140e] px-3 pb-3 pt-[112px] sm:px-5 sm:pb-5 sm:pt-[122px]">
        {/* کادر اصلی ویدئو؛ پایین‌تر از هدر */}
        <div className="relative h-[calc(100svh-124px)] min-h-[520px] w-full overflow-hidden rounded-[1.75rem] border border-[#dec06d]/25 bg-[#02140e] shadow-[0_30px_90px_rgba(0,0,0,0.6),0_0_35px_rgba(216,180,88,0.08)] sm:h-[calc(100svh-137px)] sm:rounded-[2.25rem]">
          {/* ویدئوی پس‌زمینه */}
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/images/hero/eloria-hero.jpeg"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source
              src="/videos/eloria-hero.mp4"
              type="video/mp4"
            />
  
            <source
              src="/videos/eloria-hero.mov"
              type="video/quicktime"
            />
          </video>
  
          {/* پوشش بسیار ملایم برای حفظ رنگ‌بندی سایت */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(1,13,9,0.08)_0%,rgba(1,18,12,0.03)_52%,rgba(1,11,7,0.48)_100%)]"
          />
  
          {/* سایه داخلی اطراف کادر */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 shadow-[inset_0_0_130px_30px_rgba(0,0,0,0.32)]"
          />
  
          {/* نور طلایی ظریف */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9b55c]/5 blur-[130px]"
          />
  
          {/* خط درخشان بالای کادر */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#f1d88c]/55 to-transparent"
          />
  
          {/* محوشدن پایین ویدئو */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#02150f]/75 to-transparent"
          />
        </div>
      </section>
    );
  }