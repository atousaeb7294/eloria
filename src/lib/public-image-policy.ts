/** Explicit sources shared by article rendering and the HTML CSP. */
export function publicImageSources(): string[] {
  const sources = new Set(["https://trustseal.enamad.ir", "https://*.supabase.co"]);
  for (const value of [process.env.SUPABASE_URL || "", ...(process.env.ELORIA_ALLOWED_IMAGE_HOSTS || "").split(",")]) {
    if (!value.trim()) continue;
    try {
      const url = new URL(value.includes("://") ? value.trim() : `https://${value.trim()}`);
      if (url.protocol === "https:" && !url.username && !url.password) sources.add(url.origin);
    } catch { /* Invalid configuration must not broaden CSP. */ }
  }
  return [...sources];
}
export function isPublicArticleImage(value: string): boolean {
  if (/^\/(?!\/)/.test(value) && !/[\\\u0000-\u0020]/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && publicImageSources().includes(url.origin); } catch { return false; }
}
