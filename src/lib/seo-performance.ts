export type PerformanceReading = { device: string; url: string; checkedAt: string; status: string; score?: number; lcpMs?: number; cls?: number; tbtMs?: number; message?: string };
/** Lab observations only. No invented CrUX/INP or ranking scores. */
export async function measureSeoPerformance(): Promise<PerformanceReading[]> {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY?.trim();
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const checkedAt = new Date().toISOString();
  if (!configured) return [{ device: "mobile/desktop", url: configured || "", checkedAt, status: "NOT_CONFIGURED", message: "نشانی عمومی سایت برای اندازه‌گیری لازم است." }];
  const root = new URL(configured);
  if (root.protocol !== "https:" || root.username || root.password) throw new Error("Invalid public site URL");
  // Rotate templates so repeated runs cover home, catalog, atelier and journal.
  const paths = ["/fa", "/fa/products", "/fa/atelier", "/fa/journal", "/fa/contact"];
  const url = new URL(paths[Math.floor(Date.now() / 86400000) % paths.length], root).href;
  const results: PerformanceReading[] = [];
  for (const device of ["mobile", "desktop"]) {
    try {
      const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
      for (const [k, v] of Object.entries({ url, strategy: device, category: "performance", ...(key ? { key } : {}) })) endpoint.searchParams.set(k, v);
      const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(`PageSpeed HTTP ${response.status}`);
      const result = await response.json(); const report = result.lighthouseResult;
      if (!report?.audits || typeof report.categories?.performance?.score !== "number") throw new Error("PageSpeed returned no usable report");
      results.push({ device, url, checkedAt, status: "MEASURED_LAB", score: Math.round(report.categories.performance.score * 100), lcpMs: report.audits["largest-contentful-paint"]?.numericValue, cls: report.audits["cumulative-layout-shift"]?.numericValue, tbtMs: report.audits["total-blocking-time"]?.numericValue });
    } catch (error) { results.push({ device, url, checkedAt, status: "UNAVAILABLE", message: error instanceof Error && error.message.startsWith("PageSpeed") ? error.message : "اندازه‌گیری کامل نشد؛ هیچ امتیازی برآورد نشده است." }); }
  }
  return results;
}
