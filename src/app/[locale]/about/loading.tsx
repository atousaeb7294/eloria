export default function AboutLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="relative min-h-screen overflow-hidden bg-[#02140f] px-4 pb-24 pt-36 text-[#f3e6c9] sm:px-6 sm:pt-40"
    >
      <span className="sr-only">
        Loading Eloria story
      </span>

      <section className="mx-auto max-w-6xl">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[#d9b85f]/15" />
          <div className="mt-5 h-12 w-72 max-w-full animate-pulse rounded-2xl bg-white/[0.055]" />
          <div className="mt-4 h-3 w-96 max-w-full animate-pulse rounded-full bg-white/[0.035]" />
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="relative min-h-52 overflow-hidden rounded-[2rem] border border-[#d9b85f]/12 bg-[linear-gradient(145deg,rgba(7,35,27,0.82),rgba(3,21,15,0.9))] p-6 after:pointer-events-none after:absolute after:inset-y-0 after:-left-1/2 after:w-1/2 after:animate-[eloria-shimmer_1.8s_ease-in-out_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/[0.045] after:to-transparent"
            >
              <div className="h-10 w-10 animate-pulse rounded-xl bg-[#d9b85f]/[0.06]" />
              <div className="mt-7 h-6 w-1/2 animate-pulse rounded-full bg-white/[0.055]" />
              <div className="mt-5 h-3 w-full animate-pulse rounded-full bg-white/[0.035]" />
              <div className="mt-3 h-3 w-4/5 animate-pulse rounded-full bg-white/[0.03]" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
