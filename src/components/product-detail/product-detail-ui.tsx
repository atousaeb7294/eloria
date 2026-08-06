import type { ReactNode } from "react";

export const collectionNames: Record<
  string,
  {
    fa: string;
    en: string;
  }
> = {
  necklaces: {
    fa: "گردنبندها",
    en: "Necklaces",
  },

  bracelets: {
    fa: "دستبندها",
    en: "Bracelets",
  },

  earrings: {
    fa: "گوشواره‌ها",
    en: "Earrings",
  },
};

export const fallbackImages: Record<
  string,
  string
> = {
  necklaces:
    "/images/collections/necklaces.jfif",

  bracelets:
    "/images/collections/bracelet.jpg",

  earrings:
    "/images/collections/earring.jpg",
};

export function formatToman(
  value: string,
  locale: string,
): string {
  try {
    return BigInt(
      value,
    ).toLocaleString(
      locale === "fa"
        ? "fa-IR"
        : "en-US",
    );
  } catch {
    return value;
  }
}

export function formatDecimal(
  value:
    | string
    | number
    | null,
  locale: string,
): string {
  if (
    value === null ||
    value === ""
  ) {
    return "—";
  }

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return String(
      value,
    );
  }

  return numericValue.toLocaleString(
    locale === "fa"
      ? "fa-IR"
      : "en-US",
    {
      maximumFractionDigits:
        3,
    },
  );
}

export function SpecificationItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="group flex min-h-20 items-center gap-3 rounded-2xl border border-white/[0.065] bg-white/[0.025] px-4 py-3 transition duration-300 hover:border-[#d9b85f]/20 hover:bg-white/[0.04]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d9b85f]/22 bg-[#d9b85f]/[0.045] text-[#d9be72] transition duration-300 group-hover:scale-105 group-hover:border-[#e5c975]/35">
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block text-[10px] text-white/48">
          {label}
        </span>

        <strong className="mt-1 block truncate text-sm font-medium text-[#e8ddc8]">
          {value}
        </strong>
      </span>
    </div>
  );
}

export function PriceInformationItem({
  icon,
  label,
  value,
  isGold,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  isGold: boolean;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border px-4 py-4",

        isGold
          ? "border-[#d9b85f]/20 bg-[#d9b85f]/[0.035]"
          : "border-[#dce6e9]/16 bg-[#dce6e9]/[0.025]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span
          className={[
            "flex h-8 w-8 items-center justify-center rounded-lg border",

            isGold
              ? "border-[#d9b85f]/25 bg-[#d9b85f]/[0.055] text-[#e4c46d]"
              : "border-[#dce6e9]/20 bg-[#dce6e9]/[0.04] text-[#dfe8eb]",
          ].join(" ")}
        >
          {icon}
        </span>

        <span className="text-[10px] text-white/48">
          {label}
        </span>
      </div>

      <strong
        className={[
          "mt-3 block text-sm font-medium",

          isGold
            ? "text-[#f0d78f]"
            : "text-[#e3ecee]",
        ].join(" ")}
      >
        {value}
      </strong>
    </div>
  );
}

export function PurchaseAssuranceItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.065] bg-black/10 px-3.5 py-3.5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d9b85f]/22 bg-[#d9b85f]/[0.05] text-[#dfc16e]">
        {icon}
      </span>

      <span className="min-w-0">
        <strong className="block text-[11px] font-medium text-[#eadfc9]">
          {title}
        </strong>

        <span className="mt-1 block text-[10px] leading-5 text-white/42">
          {description}
        </span>
      </span>
    </div>
  );
}
