export default function CollectionsLoading() {
  return (
    <section aria-busy="true" className="min-h-[70vh] bg-[#031811] px-6 py-24 text-[#ead3a0]">
      <div role="status" className="mx-auto max-w-6xl">
        <p lang="fa" dir="rtl">در حال دریافت آثار…</p>
        <p lang="en" className="mt-2 text-sm">Loading creations…</p>
        <div aria-hidden="true" className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="aspect-square rounded-full border border-[#ead3a0]/20 bg-white/5" />
          ))}
        </div>
      </div>
    </section>
  );
}
