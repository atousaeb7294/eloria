import {
  HomeFeaturedAlbum,
} from "@/components/home-featured-album";

type HomeNarrativeShowcaseProps = {
  locale: string;
  copy: {
    finalEyebrow: string;
    finalTitle: string;
  };
};

const FA_KICKER =
  "\u06af\u0632\u06cc\u062f\u0647\u200c\u0627\u06cc \u0627\u0632 \u06af\u0646\u062c\u06cc\u0646\u0647 \u0627\u0644\u0648\u0631\u06cc\u0627";

const FA_NOTE =
  "\u0632\u06cc\u0628\u0627\u06cc\u06cc \u062f\u0631 \u062c\u0632\u0626\u06cc\u0627\u062a\u06cc\u200c\u0633\u062a \u06a9\u0647 \u0645\u0627\u0646\u062f\u06af\u0627\u0631 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.";

function PersianOrnamentLayer() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden text-[#d7b66d]"
    >
      <svg
        viewBox="0 0 1200 820"
        className="absolute inset-0 h-full w-full opacity-[0.11]"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="eloria-home-persian-pattern"
            width="190"
            height="190"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M95 24 112 60 148 77 112 94 95 130 78 94 42 77 78 60 95 24Z"
              stroke="currentColor"
              strokeWidth="1"
            />

            <circle
              cx="95"
              cy="77"
              r="28"
              stroke="currentColor"
              strokeWidth="0.8"
              opacity="0.52"
            />

            <path
              d="M66 48 95 77 124 48M66 106 95 77 124 106"
              stroke="currentColor"
              strokeWidth="0.75"
              opacity="0.38"
            />
          </pattern>

          <radialGradient
            id="eloria-home-persian-mask-gradient"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(600 410) rotate(90) scale(430 620)"
          >
            <stop
              stopColor="white"
              stopOpacity="0.78"
            />
            <stop
              offset="0.58"
              stopColor="white"
              stopOpacity="0.18"
            />
            <stop
              offset="1"
              stopColor="white"
              stopOpacity="0"
            />
          </radialGradient>

          <mask id="eloria-home-persian-mask">
            <rect
              width="1200"
              height="820"
              fill="url(#eloria-home-persian-mask-gradient)"
            />
          </mask>
        </defs>

        <rect
          width="1200"
          height="820"
          fill="url(#eloria-home-persian-pattern)"
          mask="url(#eloria-home-persian-mask)"
        />

        <path
          d="M52 178C128 108 200 94 286 108C213 134 175 174 156 232C130 203 99 185 52 178Z"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.58"
        />

        <path
          d="M1148 178C1072 108 1000 94 914 108C987 134 1025 174 1044 232C1070 203 1101 185 1148 178Z"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.58"
        />

        <path
          d="M68 662C137 716 210 725 290 707C220 687 178 651 156 596C133 620 104 643 68 662Z"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.34"
        />

        <path
          d="M1132 662C1063 716 990 725 910 707C980 687 1022 651 1044 596C1067 620 1096 643 1132 662Z"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.34"
        />

        <path
          d="M600 52 613 81 642 94 613 107 600 136 587 107 558 94 587 81 600 52Z"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.68"
        />
      </svg>
    </div>
  );
}

export function HomeNarrativeShowcase({
  locale,
  copy,
}: HomeNarrativeShowcaseProps) {
  const isPersian =
    locale === "fa";

  return (
    <section
      dir={isPersian ? "rtl" : "ltr"}
      className="relative isolate overflow-hidden py-14 sm:py-20 lg:py-24"
      data-eloria-narrative-section="true"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_29%,rgba(18,105,76,.17),transparent_37%),radial-gradient(circle_at_50%_72%,rgba(215,182,95,.05),transparent_34%)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[42px] border border-[#d7b65e]/13 bg-[linear-gradient(145deg,rgba(5,29,21,.76),rgba(2,14,10,.93)_54%,rgba(6,32,23,.68))] px-3 pb-10 pt-8 shadow-[0_36px_140px_rgba(0,0,0,.26)] sm:px-7 sm:pb-13 sm:pt-11 lg:px-10 lg:pb-15">
          <PersianOrnamentLayer />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[-170px] h-[340px] w-[62%] -translate-x-1/2 rounded-[50%] border border-[#d8b760]/[0.05]"
          />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-[linear-gradient(90deg,transparent,rgba(216,183,96,.46))] sm:w-16" />

              <span
                className={
                  isPersian
                    ? "font-sans text-[11px] font-medium leading-6 tracking-normal text-[#dbc789]/68 sm:text-[12px]"
                    : "text-[9px] font-medium tracking-[0.22em] text-[#dbc789]/68 sm:text-[10px]"
                }
              >
                {copy.finalEyebrow}
              </span>

              <span className="h-px w-10 bg-[linear-gradient(90deg,rgba(216,183,96,.46),transparent)] sm:w-16" />
            </div>

            <p
              className={
                isPersian
                  ? "font-sans mt-4 text-[11px] font-medium leading-7 tracking-normal text-[#d8c69b]/50 sm:text-[12px]"
                  : "mt-4 text-[10px] font-medium tracking-[0.13em] text-[#d8c69b]/50 sm:text-[11px]"
              }
            >
              {isPersian
                ? FA_KICKER
                : "A CURATION FROM THE ELORIA COLLECTION"}
            </p>

            <h2
              className={
                isPersian
                  ? "font-persian-title mx-auto mt-3 max-w-2xl text-[15px] text-[#eee2c7]/82 sm:text-[17px]"
                  : "mx-auto mt-3 max-w-2xl text-[14px] font-normal leading-8 text-[#eee2c7]/82 sm:text-[16px] sm:leading-9"
              }
            >
              {copy.finalTitle}
            </h2>

            <p
              className={
                isPersian
                  ? "font-sans mx-auto mt-2 max-w-xl text-[11px] leading-7 tracking-normal text-[#d1c3a3]/48 sm:text-[12px]"
                  : "mx-auto mt-2 max-w-xl text-[10px] leading-6 text-[#d1c3a3]/48 sm:text-[11px]"
              }
            >
              {isPersian
                ? FA_NOTE
                : "Beauty lives in details made to endure."}
            </p>
          </div>

          <div className="relative z-10 mt-6 sm:mt-8">
            <HomeFeaturedAlbum
              locale={locale}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
