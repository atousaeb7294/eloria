export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="در حال دریافت آثار / Loading creations"
      className="min-h-screen bg-[#02140e] px-6 pt-32 text-[#f8f0df]">
      <div aria-hidden="true" className="mx-auto max-w-5xl space-y-8">
        <div className="h-8 w-44 rounded bg-[#ead3a0]/15" />
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="aspect-square rounded-3xl border border-[#ead3a0]/15 bg-[#ead3a0]/5" />)}
        </div>
        <p className="text-center text-sm">…</p>
      </div>
    </div>
  );
}
