/** Editorial normalization only; never applies to product facts, URLs, code or legends. */
export function normalizePersianSeo(value: string): string {
  return value.normalize("NFC").replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/[ \t]+/g, " ").replace(/ +([،؛؟!])/g, "$1").trim();
}
export function plainSeoText(value: string, max = 160): string {
  const text = value.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<[^>]*>/g, " ")
    .replace(/[#*_`]/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max); const space = cut.lastIndexOf(" ");
  return cut.slice(0, space > max * .65 ? space : max).trim();
}
export function safeArticleHref(value: string): string | null {
  if (/^[\u0000-\u0020]|[\u0000-\u001f\u007f\\]/u.test(value)) return null;
  if (/^\/(?!\/)/.test(value)) return value;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function factualImageAlt(name: string, locale: "fa" | "en", index = 0): string {
  const base = plainSeoText(locale === "fa" ? normalizePersianSeo(name) : name, 140);
  if (!base) return "";
  return index ? `${base} — ${locale === "fa" ? "تصویر" : "image"} ${index + 1}` : base;
}
export function editorialFindings(content: string): string[] {
  const found: string[] = [];
  if (/[يك]/u.test(content)) found.push("حروف عربی ی/ک در متن؛ بازبینی نگارش فارسی");
  if (/ {2,}| +[،؛؟]/u.test(content)) found.push("فاصله‌گذاری متن نیاز به بازبینی دارد");
  if (/(?:^|\s)(?:می|نمی) [\u0600-\u06ff]+/u.test(content)) found.push("نیم‌فاصلهٔ فعل‌ها را بررسی کنید");
  if (!/^#{1,3}\s+/m.test(content) && content.length > 1500) found.push("برای خوانایی مقاله، تیترهای میانی را بررسی کنید");
  const images = [...content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  if (images.some(m => !m[1].trim())) found.push("تصویر داخل مقاله متن جایگزین ندارد؛ تزئینی‌بودن را بررسی کنید");
  if ([...content.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)].some(m => !safeArticleHref(m[1]))) found.push("پیوند نامعتبر یا ناامن در مقاله");
  return found;
}

export function normalizePersianArticle(value: string): string {
  // Preserve fenced/inline code, link destinations and raw URLs verbatim.
  return value.split(/(```[\s\S]*?```|`[^`\n]*`|\]\([^)]*\)|https?:\/\/\S+)/g).map((part, i) => {
    if (i % 2) return part;
    return part.replace(/ي/g, "ی").replace(/ك/g, "ک")
      .replace(/ +([،؛؟])/g, "$1")
      .replace(/(^|[\s(])((?:ن?می)) (شود|شوند|کند|کنند|تواند|توانند|باشد|باشند)(?=[\s،.؛؟!)]|$)/g, "$1$2‌$3");
  }).join("");
}
