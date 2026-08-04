import {
  CreditCard,
  ShoppingBag,
  UserRound,
} from "lucide-react";

type PurchaseProgressProps = {
  locale: string;
  currentStep: 1 | 2 | 3;
};

export function PurchaseProgress({
  locale,
  currentStep,
}: PurchaseProgressProps) {
  const isPersian =
    locale === "fa";

  const steps = [
    {
      id: 1,
      label: isPersian
        ? "سبد خرید"
        : "Bag",
      Icon: ShoppingBag,
    },
    {
      id: 2,
      label: isPersian
        ? "اطلاعات ارسال"
        : "Details",
      Icon: UserRound,
    },
    {
      id: 3,
      label: isPersian
        ? "پرداخت"
        : "Payment",
      Icon: CreditCard,
    },
  ] as const;

  return (
    <nav
      aria-label={
        isPersian
          ? "مراحل ثبت سفارش"
          : "Checkout progress"
      }
      className="mx-auto mt-7 w-full max-w-xl"
    >
      <ol className="grid grid-cols-3">
        {steps.map(
          ({
            id,
            label,
            Icon,
          }, index) => {
            const isComplete =
              id < currentStep;

            const isActive =
              id === currentStep;

            return (
              <li
                key={id}
                aria-current={
                  isActive
                    ? "step"
                    : undefined
                }
                className="relative flex min-w-0 flex-col items-center text-center"
              >
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className={[
                      "absolute end-1/2 top-[1.15rem] h-px w-full",
                      isComplete ||
                      isActive
                        ? "bg-gradient-to-r from-[#d8b85f]/30 to-[#e8ce7b]/75"
                        : "bg-white/[0.09]",
                    ].join(" ")}
                  />
                )}

                <span
                  className={[
                    "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-xl transition sm:h-10 sm:w-10",
                    isActive
                      ? "border-[#efd27b]/70 bg-[#d9b85f]/15 text-[#f5df9c] shadow-[0_0_24px_rgba(217,184,95,0.16)]"
                      : isComplete
                        ? "border-[#d9b85f]/40 bg-[#d9b85f]/[0.08] text-[#e6cc7c]"
                        : "border-white/[0.1] bg-[#041b14]/80 text-white/30",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <span
                  className={[
                    "mt-2 truncate px-1 text-[10px] sm:text-[11px]",
                    isActive
                      ? "text-[#f0dc9d]"
                      : isComplete
                        ? "text-[#d5c28e]/75"
                        : "text-white/35",
                  ].join(" ")}
                >
                  {label}
                </span>
              </li>
            );
          },
        )}
      </ol>
    </nav>
  );
}
