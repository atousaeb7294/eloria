export default function Loading() {
  return <main aria-busy="true" role="status" className="eloria-route-loading">
    <div className="eloria-navigation-progress" aria-hidden="true" />
    <p><span lang="fa" dir="rtl">در حال بازکردن صفحه…</span><span lang="en">Loading…</span></p>
  </main>;
}
