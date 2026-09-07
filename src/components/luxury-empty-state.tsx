import Link from "next/link";
import type { ReactNode } from "react";
import { SearchX } from "lucide-react";

type LuxuryEmptyStateProps = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  icon?: ReactNode;
};

export function LuxuryEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: LuxuryEmptyStateProps) {
  return (
    <div data-reveal className="eloria-panel relative mx-auto mt-10 max-w-2xl overflow-hidden rounded-[2.2rem] px-6 py-14 text-center sm:px-10">
      <div aria-hidden="true" className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#efd17a]/65 to-transparent" />
      <div className="relative mx-auto grid size-16 place-items-center rounded-2xl border border-[#d9b85f]/26 bg-[#d9b85f]/[0.055] text-[#e2c46f]">
        {icon ?? <SearchX className="size-7" />}
      </div>
      <h2 className="mt-6 text-xl font-semibold text-[#f0e3ca]">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-8 text-[#cdbf9f]/66">{description}</p>
      <Link href={actionHref} className="eloria-button-primary mt-7">
        {actionLabel}
      </Link>
    </div>
  );
}
