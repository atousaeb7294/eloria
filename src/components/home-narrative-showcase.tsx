import { HomeFeaturedAlbum } from "@/components/home-featured-album";
import { EloriaWovenThreads } from "@/components/eloria-woven-threads";

type HomeNarrativeShowcaseProps = {
  locale: string;
  copy: {
    finalEyebrow: string;
    finalTitle: string;
  };
};

export function HomeNarrativeShowcase({ locale, copy }: HomeNarrativeShowcaseProps) {
  const isPersian = locale === "fa";

  return (
    <section
      dir={isPersian ? "rtl" : "ltr"}
      className="eloria-home-lazy-section relative isolate overflow-hidden py-16 sm:py-22 lg:py-28"
      data-eloria-narrative-section="true"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(16,116,82,.12),transparent_34%),radial-gradient(circle_at_16%_66%,rgba(221,186,93,.035),transparent_24%)]" />
      <EloriaWovenThreads placement="showcase" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[8%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(222,190,102,.22),transparent)]" />

      <div className="relative mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">
        <header className="mx-auto mb-10 grid max-w-[1180px] gap-7 border-b border-[#ddc16e]/10 pb-8 sm:mb-12 sm:grid-cols-[.72fr_1.28fr] sm:items-end sm:pb-10 lg:mb-14">
          <div>
            <p className="text-[9px] font-semibold tracking-[.26em] text-[#dec16e]/56">ELORIA EDIT / 2026</p>
            <p className="mt-3 text-[10px] leading-6 text-[#bfae89]/38">
              {isPersian ? "جواهر، بافت و روایت در یک ویترین زنده" : "Jewellery, textile and story in a living edit"}
            </p>
          </div>

          <div className={isPersian ? "sm:text-right" : "sm:text-left"}>
            <p className="text-[10px] font-medium text-[#dbc277]/58">{copy.finalEyebrow}</p>
            <h2 className={isPersian ? "font-persian-title mt-3 max-w-3xl text-2xl text-[#f3e6ca] sm:text-3xl lg:text-4xl" : "mt-3 max-w-3xl font-serif text-3xl leading-tight text-[#f3e6ca] sm:text-4xl lg:text-5xl"}>
              {copy.finalTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-xs leading-7 text-[#c8b995]/48 sm:text-[13px]">
              {isPersian
                ? "آثار الوریا مثل صفحات یک لوک‌بوک لوکس کنار هم می‌نشینند؛ هر بار مجموعه‌ای تازه از قطعات شاخص، محبوب و تازه‌وارد پیش روی شما قرار می‌گیرد."
                : "Eloria unfolds like a luxury lookbook, bringing together a fresh edit of signature, loved and newly arrived creations."}
            </p>
          </div>
        </header>

        <HomeFeaturedAlbum locale={locale} />
      </div>
    </section>
  );
}
