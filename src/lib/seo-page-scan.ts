import { prisma } from "@/lib/prisma";
export function inspectSeoHtml(html: string, expectedUrl: string) {
  const findings: string[] = [];
  const tagValue = (name: string) => html.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]?.trim() || "";
  const attrs = (tag: string, key: string) => tag.match(new RegExp(`\\b${key}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]);
  const title = tagValue("title");
  if (!title) findings.push("عنوان صفحه خالی است");
  if (/26263305/.test(title)) findings.push("کد تأیید اینماد در عنوان عمومی است؛ پس از اتمام تأیید، متغیر ELORIA_ENAMAD_TITLE_VERIFICATION را false کنید");
  if (!meta.some(t=>attrs(t,"name")?.toLowerCase()==="description" && attrs(t,"content")?.trim())) findings.push("توضیح متا موجود نیست");
  const canonical = links.find(t=>attrs(t,"rel")==="canonical");
  if (!canonical) findings.push("canonical موجود نیست");
  else { try { if (new URL((attrs(canonical,"href") || "").replace(/&amp;/g,"&"), expectedUrl).href !== new URL(expectedUrl).href) findings.push("canonical با آدرس بررسی متفاوت است؛ علت را بررسی کنید"); } catch { findings.push("canonical نامعتبر است"); } }
  const h1 = (html.match(/<h1\b/gi)||[]).length;
  if (h1 !== 1) findings.push(`تعداد H1: ${h1}؛ ساختار عنوان اصلی را بررسی کنید`);
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
  const missingAlt = images.filter(t=>attrs(t,"alt")===undefined).length;
  if (missingAlt) findings.push(`${missingAlt} تصویر فاقد ویژگی alt است`);
  const robots = meta.find(t=>attrs(t,"name")==="robots");
  if (robots && /noindex/i.test(attrs(robots,"content") || "")) findings.push("صفحه noindex است؛ عمدی‌بودن را بررسی کنید");
  let structuredData = 0;
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); structuredData++; } catch { findings.push("JSON-LD از نظر ساختار JSON معتبر نیست"); }
  }
  return { title, h1, images: images.length, missingAlt, structuredData, findings };
}
export async function scanSeoPages(offset = 0) {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!site) return { nextOffset: offset, pages: [], status: "SITE_URL_MISSING" };
  const root = new URL(site);
  if (root.protocol !== "https:" || root.username || root.password) return { nextOffset: offset, pages: [], status: "INVALID_SITE_URL" };
  const [products, articles] = await Promise.all([
    prisma.product.findMany({where:{status:{in:["ACTIVE","OUT_OF_STOCK"]},collection:{isActive:true}},select:{slug:true},orderBy:{id:"asc"}}),
    prisma.contentArticle.findMany({where:{status:"PUBLISHED"},select:{slug:true},orderBy:{id:"asc"}}),
  ]);
  const paths = ["", "/products", "/collections", "/collections/men", "/atelier", "/journal", "/contact", "/about", ...products.map(p=>`/products/${encodeURIComponent(p.slug)}`), ...articles.map(a=>`/journal/${encodeURIComponent(a.slug)}`)].flatMap(p=>["/fa"+p,"/en"+p]);
  const pages = [];
  for (let i=0;i<3;i++) {
    const url = new URL(paths[(offset+i)%paths.length],root).href;
    try {
      const response = await fetch(url,{cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(8000)});
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) { await response.body?.cancel(); pages.push({url,checkedAt:new Date().toISOString(),status:response.status,findings:["صفحه HTML موفق برنگرداند؛ مسیر و پاسخ سرور را بررسی کنید"]}); continue; }
      const reader=response.body!.getReader(); const decoder=new TextDecoder(); let html="", bytes=0;
      try { while(true){const {value,done}=await reader.read(); if(done)break;bytes+=value.length;if(bytes>2_000_000)throw new Error("HTML too large");html+=decoder.decode(value,{stream:true});}html+=decoder.decode(); }
      finally {await reader.cancel().catch(()=>undefined);reader.releaseLock();}
      pages.push({url,checkedAt:new Date().toISOString(),status:response.status,...inspectSeoHtml(html,url)});
    } catch {pages.push({url,checkedAt:new Date().toISOString(),status:0,findings:["دریافت صفحه کامل نشد؛ این نتیجه سلامت صفحه را تأیید نمی‌کند"]});}
  }
  return {nextOffset:(offset+3)%paths.length,totalPages:paths.length,pages,status:"SCANNED"};
}
