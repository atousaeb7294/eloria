export type SeoAuditPage = {
  id: string; path: string; title: string; description: string;
  hasImage: boolean; missingAlt: boolean; internalLinkCount?: number;
};
export type SeoFinding = { path: string; severity: "HIGH" | "MEDIUM"; issue: string; repairable: boolean };
/** Deterministic on-page checks. No invented ranking or backlink data. */
export function auditSeoPages(pages: SeoAuditPage[]): SeoFinding[] {
  const findings: SeoFinding[] = [];
  const titles = new Map<string, number>();
  for (const page of pages) {
    const title = page.title.trim().toLocaleLowerCase();
    if (title) titles.set(title, (titles.get(title) ?? 0) + 1);
  }
  for (const page of pages) {
    const add = (issue: string, severity: "HIGH" | "MEDIUM", repairable = false) => findings.push({ path: page.path, issue, severity, repairable });
    if (!page.title.trim()) add("عنوان سئو خالی است", "HIGH", true);
    else if (page.title.length > 65) add("عنوان سئو طولانی است؛ بازنویسی را بررسی کنید", "MEDIUM");
    if ((titles.get(page.title.trim().toLocaleLowerCase()) ?? 0) > 1) add("عنوان تکراری در چند صفحه", "MEDIUM");
    if (!page.description.trim()) add("توضیح سئو خالی است", "HIGH", true);
    else if (page.description.length < 50 || page.description.length > 170) add("طول توضیح سئو نیاز به بازبینی دارد", "MEDIUM");
    if (!page.hasImage) add("تصویر صفحه موجود نیست", "HIGH");
    if (page.missingAlt) add("متن جایگزین تصویر ناقص است", "MEDIUM", true);
    if (page.internalLinkCount === 0) add("مقاله پیوند داخلی ندارد", "MEDIUM");
  }
  return findings;
}
export function seoText(value: string, limit: number): string {
  return value.replace(/<[^>]*>/g, " ").replace(/[#*_`]/g, "").replace(/\s+/g, " ").trim().slice(0, limit);
}
