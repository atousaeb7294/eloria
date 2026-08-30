import Link from "next/link";

import { notFound } from "next/navigation";

import { setRequestLocale } from "next-intl/server";

import {
  Crown,
  Gem,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { InternalPageShell } from "@/components/internal-page-shell";

import {
  MagicArrowIcon,
  WorldRuneIcon,
} from "@/components/luxury-icons";

type AboutPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const principles = [
  {
    icon: Crown,
    fa: {
      title: "شکوه ماندگار",
      description:
        "جواهرهایی که از موج‌های زودگذر عبور می‌کنند و هویت خود را در گذر زمان حفظ می‌کنند.",
    },
    en: {
      title: "Enduring Grandeur",
      description:
        "Jewelry that moves beyond temporary trends and preserves its identity through time.",
    },
  },
  {
    icon: Gem,
    fa: {
      title: "جزئیات اصیل",
      description:
        "هر فرم، نقش و پرداخت با هدفی مشخص انتخاب می‌شود تا هیچ جزئیاتی بی‌معنا باقی نماند.",
    },
    en: {
      title: "Authentic Detail",
      description:
        "Every form, symbol and finish is selected intentionally, leaving no detail without meaning.",
    },
  },
  {
    icon: ScrollText,
    fa: {
      title: "روایت شخصی",
      description:
        "هر جواهر از الوریا داستانی را آغاز می‌کند که با حضور صاحب آن کامل می‌شود.",
    },
    en: {
      title: "A Personal Narrative",
      description:
        "Every Eloria jewel begins a story that is completed through the presence of its owner.",
    },
  },
  {
    icon: ShieldCheck,
    fa: {
      title: "اعتماد و شفافیت",
      description:
        "قیمت، مشخصات، وزن و اطلاعات هر محصول با ساختاری روشن و قابل بررسی ارائه می‌شود.",
    },
    en: {
      title: "Trust and Clarity",
      description:
        "The price, specifications, weight and details of every product are presented transparently.",
    },
  },
] as const;

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;

  if (locale !== "fa" && locale !== "en") {
    notFound();
  }

  setRequestLocale(locale);

  const isPersian = locale === "fa";

  return (
    <InternalPageShell locale={locale}>
      <section className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-28 pt-[132px] sm:px-6 sm:pt-[144px] lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/${locale}#hero`}
            className="group flex items-center gap-3 rounded-full border border-[#d9b85f]/32 bg-[#061f17]/80 py-1.5 pe-4 ps-1.5 text-[11px] text-[#e5d19a] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#efd17d]/65"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9b85f]/25">
              <WorldRuneIcon className="h-5 w-5" />
            </span>
            <span>{isPersian ? "بازگشت به خانه" : "Back to home"}</span>
          </Link>

          <Link
            href={`/${locale}/products`}
            className="rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-[10px] text-white/55 backdrop-blur-xl transition hover:border-[#d9b85f]/34 hover:text-[#ead699]"
          >
            {isPersian ? "مشاهده جواهرها" : "View jewelry"}
          </Link>
        </div>

        <header className="mx-auto mt-12 max-w-4xl text-center">
          <div className="mb-5 flex items-center justify-center gap-4">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#d3b35b]/65 sm:w-28" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#d9ba63]/38 bg-[radial-gradient(circle,rgba(211,176,85,0.15),rgba(4,29,21,0.9)_70%)] text-[#e7ca77]">
              <span className="absolute inset-[6px] rounded-full border border-dashed border-[#e0c26d]/22" />
              <Sparkles className="relative h-7 w-7" />
            </div>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#d3b35b]/65 sm:w-28" />
          </div>

          <p className="text-[9px] uppercase tracking-[0.46em] text-[#cfb66f]/60">
            The Story of Eloria
          </p>

          <h1
            className={[
              "mt-3 text-[#f6e8c6]",
              isPersian
                ? "font-persian-title pb-5 text-4xl font-semibold leading-[1.95] sm:text-5xl lg:text-6xl"
                : "text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl",
            ].join(" ")}
          >
            {isPersian ? "داستان الوریا" : "The Story of Eloria"}
          </h1>

          <p className="mx-auto max-w-3xl text-sm leading-9 text-[#d8caaa]/72 sm:text-base">
            {isPersian
              ? "الوریا نام سرزمینی است که در روایت‌ها «سرزمین افسانه‌ها» خوانده می‌شد؛ جایی که زر، سنگ و بافت فقط زینت نبودند، بلکه نشانه‌هایی برای نگه‌داشتن پیمان‌ها، خاطره‌ها و رازها بودند."
              : "Eloria is the name of a lost realm remembered as the Land of Legends, where gold, stone and woven thread were not merely ornament, but vessels for vows, memory and secrets."}
          </p>
        </header>

        <article className="relative mx-auto mt-14 max-w-6xl overflow-hidden rounded-[2.8rem] border border-[#d8b860]/22 bg-[linear-gradient(145deg,rgba(7,43,31,0.92),rgba(2,20,14,0.98))] px-6 py-10 shadow-[0_34px_100px_rgba(0,0,0,0.44)] backdrop-blur-xl sm:px-10 sm:py-14 lg:px-16">
          <div aria-hidden="true" className="absolute inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-[#efd17a]/68 to-transparent" />
          <div aria-hidden="true" className="absolute -end-32 -top-32 size-80 rounded-full bg-[#d4b258]/[0.07] blur-[90px]" />

          <div className="relative grid items-center gap-9 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-[9px] uppercase tracking-[0.4em] text-[#d3bb78]/58">
                {isPersian ? "آغاز افسانه" : "The Beginning"}
              </p>
              <h2
                className={[
                  "mt-4 text-[#f2e1ba]",
                  isPersian
                    ? "font-persian-title text-3xl font-semibold leading-[1.9] sm:text-4xl"
                    : "text-3xl font-semibold leading-tight sm:text-4xl",
                ].join(" ")}
              >
                {isPersian
                  ? "سرزمینی که از نقشه‌ها محو شد"
                  : "The realm erased from maps"}
              </h2>
            </div>

            <div className="space-y-4 text-sm leading-9 text-[#d6c8aa]/70 sm:text-base">
              <p>
                {isPersian
                  ? "در روایت‌های قدیمی، الوریا میان کوه، کویر و دریا قرار داشت؛ سرزمینی که مردمش باور داشتند بعضی لحظه‌ها نباید فقط در حافظهٔ انسان بمانند. برای همین عهدها، سوگ‌ها، عشق‌ها و پیروزی‌ها را در طلا، سنگ و گره ثبت می‌کردند تا چیزی از آن لحظه برای نسل بعد باقی بماند."
                  : "Old accounts place Eloria between mountain, desert and sea. Its people believed some moments should not live only in memory, so vows, grief, love and victory were bound into gold, stone and woven knots for the next generation to inherit."}
              </p>
              <p className="text-[#cbbb9d]/62">
                {isPersian
                  ? "زرگران الوریا را «نگهبانان نشان» می‌نامیدند؛ زیرا هر قطعه پیش از ساخته‌شدن صاحب معنایی مشخص می‌شد. هیچ دو نشان قرار نبود داستان یکسانی داشته باشند."
                  : "Eloria’s jewelers were known as Keepers of the Sign, because every piece was given a meaning before it was made. No two signs were meant to carry the same story."}
              </p>
            </div>
          </div>
        </article>

        <article className="relative mx-auto mt-8 max-w-6xl overflow-hidden rounded-[2.8rem] border border-[#d8b860]/22 bg-[linear-gradient(145deg,rgba(9,45,32,0.94),rgba(2,20,14,0.99))] px-6 py-10 shadow-[0_34px_100px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:px-10 sm:py-14 lg:px-16">
          <div aria-hidden="true" className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#efd17a]/65 to-transparent" />
          <div aria-hidden="true" className="absolute -start-28 top-8 size-64 rounded-full bg-[#d4b258]/[0.06] blur-[90px]" />

          <div className="relative mx-auto max-w-4xl">
            <p className="text-[9px] uppercase tracking-[0.4em] text-[#d3bb78]/58">
              {isPersian ? "افسانهٔ مادر الوریا" : "The Mother Legend of Eloria"}
            </p>
            <h2
              className={[
                "mt-4 text-[#f2e1ba]",
                isPersian
                  ? "font-persian-title text-3xl font-semibold leading-[1.9] sm:text-4xl"
                  : "text-3xl font-semibold leading-tight sm:text-4xl",
              ].join(" ")}
            >
              {isPersian ? "الوریا؛ سرزمین افسانه‌ها و نشان‌هایی که باقی ماندند" : "Eloria; the Land of Legends and the signs that remained"}
            </h2>

            <div className="mt-6 space-y-5 text-sm leading-9 text-[#d6c8aa]/72 sm:text-base">
              <p>
                {isPersian
                  ? "در الوریا، طلا را حافظهٔ خورشید، سنگ را حافظهٔ زمین و نخ را راهی میان این دو می‌دانستند. هر خاندان نشانه‌های خودش را داشت و هر نشان به یک واقعه، یک شخص یا یک پیمان تعلق می‌گرفت؛ چیزی که باید پس از فراموش‌شدن نام‌ها هم باقی می‌ماند."
                  : "In Eloria, gold was called the memory of the sun, stone the memory of the earth, and thread the path between them. Every house kept its own signs, each tied to a person, an event or a vow meant to outlive the names of those who made it."}
              </p>
              <p>
                {isPersian
                  ? "مشهورترین روایت از شبی آغاز می‌شود که دروازه‌های الوریا برای همیشه بسته شدند. پیش از سپیده، نگهبانان نشان، قطعات زر و سنگ‌های خاندان‌ها را میان بافت‌ها پنهان کردند تا اگر شهر سقوط کرد، تاریخش یک‌جا از بین نرود. صبح که رسید، بخشی از شهر خالی بود و بسیاری از نام‌ها برای همیشه ناپدید شده بودند."
                  : "The best-known account begins on the night Eloria’s gates were sealed for the last time. Before dawn, the Keepers of the Sign hid family gold and stones within woven cords so the city’s history could not disappear in a single fall. By morning, part of the city stood empty and many names had vanished with it."}
              </p>
              <p>
                {isPersian
                  ? "سال‌ها بعد، در نقاط دور از هم، جواهرهایی با همان زبان نشانه‌ها پیدا شدند؛ هر کدام تکه‌ای از یک ماجرا و هر کدام متعلق به کسی که دیگر در هیچ سندی نامی از او نبود. آنچه امروز «الوریا» نامیده می‌شود، ادامهٔ همان زبان است: هر اثر یک نشان، و هر نشان بخشی از افسانه‌ای بزرگ‌تر که هنوز تمام حقیقتش آشکار نشده است."
                  : "Years later, jewels bearing the same language of signs appeared far apart from one another, each holding a fragment of an event and belonging to someone whose name survived nowhere else. What is called Eloria today continues that language: every piece is a sign, and every sign belongs to a larger legend whose full truth has never been recovered."}
              </p>
            </div>
          </div>
        </article>

        <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((principle) => {
            const Icon = principle.icon;
            const content = principle[isPersian ? "fa" : "en"];

            return (
              <article
                key={principle.en.title}
                className="group rounded-[2rem] border border-white/[0.075] bg-[#061c15]/78 p-5 shadow-[0_24px_65px_rgba(0,0,0,0.3)] backdrop-blur-xl transition duration-500 hover:border-[#d9b85f]/30 sm:p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9b85f]/24 bg-[#d9b85f]/[0.05] text-[#dfc26e] transition group-hover:border-[#efd17a]/45">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-lg font-medium text-[#eee1c7]">
                  {content.title}
                </h2>
                <p className="mt-3 text-xs leading-7 text-[#cbbd9d]/64">
                  {content.description}
                </p>
              </article>
            );
          })}
        </div>

        <article className="relative mx-auto mt-8 max-w-6xl overflow-hidden rounded-[2.5rem] border border-[#d9b85f]/22 bg-[linear-gradient(135deg,rgba(9,50,36,0.92),rgba(2,20,14,0.98))] px-6 py-11 text-center shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:px-10 sm:py-14">
          <div aria-hidden="true" className="absolute inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-[#efd17a]/65 to-transparent" />
          <p className="text-[9px] uppercase tracking-[0.4em] text-[#d1ba78]/55">
            A Legend to Carry
          </p>
          <h2
            className={[
              "mt-4 text-[#f3e2bb]",
              isPersian
                ? "font-persian-title text-3xl font-semibold leading-[1.9] sm:text-4xl"
                : "text-3xl font-semibold sm:text-4xl",
            ].join(" ")}
          >
            {isPersian
              ? "هر جواهر، آغاز یک روایت تازه"
              : "Every Jewel Begins a New Story"}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-8 text-[#d3c5a7]/68">
            {isPersian
              ? "داستان الوریا با ساخت یک جواهر پایان نمی‌یابد؛ از لحظه انتخاب، روایت تازه‌ای با صاحب آن آغاز می‌شود."
              : "An Eloria story does not end when a jewel is created. From the moment it is chosen, a new narrative begins with its owner."}
          </p>
          <Link
            href={`/${locale}/products`}
            className="group mx-auto mt-8 flex w-fit items-center gap-3 rounded-full border border-[#d9b85f]/42 bg-[#d9b85f]/[0.07] py-2 pe-2 ps-5 text-xs text-[#ecd794] transition hover:-translate-y-0.5 hover:border-[#efd17d]/72 hover:bg-[#d9b85f]/[0.11]"
          >
            <span>{isPersian ? "مشاهده جواهرها" : "View the jewelry"}</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#efd17a]/30">
              <MagicArrowIcon className={["h-4 w-4", isPersian ? "rotate-180" : ""].join(" ")} />
            </span>
          </Link>
        </article>
      </section>
    </InternalPageShell>
  );
}
