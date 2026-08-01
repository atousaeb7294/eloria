import {
  LoaderCircle,
  ShoppingBag,
} from "lucide-react";

type CommercePageLoadingProps = {
  variant?:
    | "catalog"
    | "cart"
    | "checkout";
};

export function CommercePageLoading({
  variant = "catalog",
}: CommercePageLoadingProps) {
  const cards =
    variant === "catalog"
      ? 6
      : variant === "cart"
        ? 3
        : 2;

  const statusText =
    variant === "catalog"
      ? "Loading catalog"
      : variant === "cart"
        ? "Loading shopping bag"
        : "Loading checkout";

  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="relative min-h-screen overflow-hidden bg-[#02140f] text-[#f3e6c9]"
    >
      <span className="sr-only">
        {statusText}
      </span>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,184,95,0.08),transparent_38%)]"
      />

      <section className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-28 pt-36 sm:px-6 lg:px-10 lg:pt-40">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d9b85f]/25 bg-[#d9b85f]/[0.06] text-[#e2c56d]">
            {variant ===
            "catalog" ? (
              <LoaderCircle className="h-6 w-6 animate-spin" />
            ) : (
              <ShoppingBag className="h-6 w-6" />
            )}
          </div>

          <div className="mt-5 h-2 w-32 animate-pulse rounded-full bg-[#d9b85f]/15" />
          <div className="mt-4 h-9 w-64 max-w-full animate-pulse rounded-xl bg-white/[0.06]" />
          <div className="mt-4 h-3 w-80 max-w-full animate-pulse rounded-full bg-white/[0.04]" />
        </div>

        <div
          className={[
            "mt-12 grid gap-5",
            variant === "catalog"
              ? "sm:grid-cols-2 lg:grid-cols-3"
              : "lg:grid-cols-[minmax(0,1fr)_370px]",
          ].join(" ")}
        >
          <div
            className={[
              "grid gap-5",
              variant === "catalog"
                ? "contents"
                : "",
            ].join(" ")}
          >
            {Array.from({
              length: cards,
            }).map((_, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-[2rem] border border-[#d9b85f]/12 bg-[linear-gradient(145deg,rgba(7,35,27,0.82),rgba(3,21,15,0.9))] p-4 after:pointer-events-none after:absolute after:inset-y-0 after:-left-1/2 after:w-1/2 after:animate-[eloria-shimmer_1.8s_ease-in-out_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/[0.045] after:to-transparent"
              >
                <div
                  className={[
                    "animate-pulse rounded-[1.5rem] bg-white/[0.045]",
                    variant ===
                    "catalog"
                      ? "aspect-[4/5]"
                      : "h-32",
                  ].join(" ")}
                />

                <div className="mt-5 h-5 w-2/3 animate-pulse rounded-full bg-white/[0.06]" />
                <div className="mt-3 h-3 w-1/2 animate-pulse rounded-full bg-white/[0.035]" />
                <div className="mt-6 h-12 animate-pulse rounded-full bg-[#d9b85f]/[0.055]" />
              </div>
            ))}
          </div>

          {variant !==
            "catalog" && (
            <aside className="hidden h-72 animate-pulse rounded-[2rem] border border-[#d9b85f]/12 bg-white/[0.035] lg:block" />
          )}
        </div>
      </section>
    </main>
  );
}
