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
              ? "الوریا جهان داستانیِ ویژهٔ این برند است: سرزمینی با ریشه‌های ایرانی که مردمش تاریخ، پیمان‌ها و نام عزیزانشان را در «نشان‌ها» ثبت می‌کردند. جواهرهای امروز الوریا بازمانده و ادامهٔ همان نشان‌ها هستند."
              : "Eloria is the brand’s own story world: an Iranian-rooted realm whose people recorded history, vows and beloved names in objects called Signs. Today’s Eloria jewels continue those Signs."}
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
                  ? "الوریا کجا بود و چرا جواهر ساخت؟"
                  : "Where was Eloria, and why did it make jewels?"}
              </h2>
            </div>

            <div className="space-y-4 text-sm leading-9 text-[#d6c8aa]/70 sm:text-base">
              <p>
                {isPersian
                  ? "در افسانهٔ مادر، الوریا در گذرگاهی میان البرز، کویر مرکزی و آب‌های جنوب شکل گرفت؛ سرزمینی خیالی اما کاملاً ایرانی در پوشش، معماری، نام‌ها و آیین‌ها. پس از آن‌که یک آتش‌سوزی بزرگ بخشی از بایگانی شهر را نابود کرد، بانویی به نام آرمیتا فرمان داد هر خاطرهٔ مهم روی چیزی ماندگار ثبت شود: زر برای پیمان، سنگ برای سرزمین و گره برای پیوند آدم‌ها."
                  : "In the mother legend, Eloria rose on a passage between Alborz, the central desert and the southern waters: a fictional realm, Iranian in dress, architecture, names and customs. After a great fire destroyed part of the city archive, a woman named Armita ordered every vital memory to be placed in something enduring: gold for vows, stone for homeland and knots for human bonds."}
              </p>
              <p className="text-[#cbbb9d]/62">
                {isPersian
                  ? "هفت زرگر و بافنده، «نگهبانان نشان» شدند. هر نشان به یک انسان، مکان و واقعهٔ مشخص تعلق داشت؛ به همین دلیل دو اثر هرگز داستان یکسان نداشتند. صاحب نشان می‌توانست داستان خودش را مستقل بخواند، اما جای هر نشان در بایگانی بزرگ شهر نیز معلوم بود."
                  : "Seven jewelers and weavers became the Keepers of the Sign. Every Sign belonged to one person, one place and one event, so no two pieces carried the same story. Each story could stand alone, while its place in the city’s larger archive remained known."}
              </p>
            </div>
          </div>
        </article>

        <article id="mother-legend" className="relative mx-auto mt-8 scroll-mt-28 max-w-6xl overflow-hidden rounded-[2.8rem] border border-[#d8b860]/22 bg-[linear-gradient(145deg,rgba(9,45,32,0.94),rgba(2,20,14,0.99))] px-6 py-10 shadow-[0_34px_100px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:px-10 sm:py-14 lg:px-16">
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
              {isPersian ? "شب دروازه‌های بسته؛ اتفاقی که جهان الوریا را ساخت" : "The Night of the Sealed Gates"}
            </h2>

            <div className="mt-6 space-y-5 text-sm leading-9 text-[#d6c8aa]/72 sm:text-base">
              <p>
                {isPersian
                  ? "سال‌ها بعد، هنگامی که سپاهی ناشناس به مرزهای الوریا رسید، شورای شهر فهمید نگه‌داشتن تمام بایگانی در یک مکان یعنی امکان نابودی همهٔ گذشته. آرمیتا و هفت نگهبان تصمیم گرفتند بایگانی را به صد نشان تقسیم کنند؛ هر نشان یک نام، یک واقعه و بخشی از نقشهٔ شهر را در خود داشت."
                  : "Years later, when an unnamed army reached Eloria’s borders, the council understood that keeping the whole archive in one place risked losing the entire past. Armita and the seven Keepers divided it into one hundred Signs; each held a name, an event and a fragment of the city map."}
              </p>
              <p>
                {isPersian
                  ? "در آخرین شب، دروازه‌ها بسته شدند تا برای خروج خانواده‌ها زمان خریده شود. نگهبانان، نشان‌ها را میان کاروان‌هایی که به شمال، شرق، غرب و جنوب می‌رفتند پخش کردند. قرار بود نسل‌های بعد با کنار هم گذاشتن آن‌ها، نام مردم و نقشهٔ الوریا را دوباره کامل کنند؛ اما آرمیتا و یکی از نگهبانان هرگز از شهر بیرون نیامدند."
                  : "On the final night, the gates were sealed to buy time for families to leave. The Keepers distributed the Signs among caravans travelling north, east, west and south. Later generations were meant to reunite them and restore Eloria’s names and map, but Armita and one Keeper never left the city."}
              </p>
              <p>
                {isPersian
                  ? "برند الوریا ادامهٔ همین مأموریت است. هر اثر تازه، شخصیت ایرانیِ خودش، زادگاه، دوره، انگیزه و ماجرایی کامل دارد؛ بنابراین داستانش به‌تنهایی قابل فهم است. در عین حال، یک سرنخ از شب دروازه‌های بسته در آن باقی می‌ماند و آن را به افسانهٔ مادر و دیگر آثار پیوند می‌دهد. با اضافه‌شدن هر اثر، بخشی تازه از نقشه و تاریخ این دنیا آشکار می‌شود."
                  : "The Eloria brand continues that mission. Every new piece has its own Iranian character, homeland, era, motive and complete event, so its story is understandable on its own. Yet each retains one clue from the Night of the Sealed Gates, linking it to the mother legend and other pieces. Every new work reveals another part of this world’s map and history."}
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
