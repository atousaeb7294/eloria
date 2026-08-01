import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

type LuxuryPageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  isPersian: boolean;
  icon?: ReactNode;
  actions?: ReactNode;
};

export function LuxuryPageHero({
  eyebrow,
  title,
  description,
  isPersian,
  icon,
  actions,
}: LuxuryPageHeroProps) {
  return (
    <header data-reveal className="mx-auto max-w-4xl text-center">
      <div className="mb-5 flex items-center justify-center gap-4">
        <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#d3b35b]/68 sm:w-24" />
        <div className="relative grid size-14 place-items-center rounded-full border border-[#d9ba63]/36 bg-[radial-gradient(circle,rgba(211,176,85,0.15),rgba(4,29,21,0.9)_70%)] text-[#e7ca77]">
          <span className="absolute inset-[5px] rounded-full border border-dashed border-[#e0c26d]/22" />
          <span className="relative">{icon ?? <Sparkles className="size-6" />}</span>
        </div>
        <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#d3b35b]/68 sm:w-24" />
      </div>

      <p className="eloria-kicker">{eyebrow}</p>
      <h1
        className={[
          "mt-4 text-[#f6e8c6]",
          isPersian
            ? "font-persian-title pb-4 text-4xl leading-[1.9] sm:text-5xl lg:text-6xl"
            : "font-serif text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl",
        ].join(" ")}
      >
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-3xl text-sm leading-8 text-[#d8caaa]/70 sm:text-base sm:leading-9">
        {description}
      </p>
      {actions ? <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">{actions}</div> : null}
    </header>
  );
}
