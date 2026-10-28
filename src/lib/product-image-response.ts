import sharp from "sharp";
import {createHash} from "node:crypto";
import {peekPublicMedia, readPublicMedia} from "./public-media-cache";
import {PRODUCT_IMAGE_WIDTHS} from "./product-image-variants";
type Asset = {bytes: Uint8Array; contentType: string};
function reply(request: Request, asset: Asset) {
  const etag = '"' + createHash('sha256').update(asset.bytes).digest('hex') + '"';
  const headers = {"Content-Type":asset.contentType,"Cache-Control":"public, max-age=86400, immutable",ETag:etag,"X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"};
  if(request.headers.get('if-none-match')?.split(',').some(x => x.trim()===etag)) return new Response(null,{status:304,headers});
  return new Response(new Uint8Array(asset.bytes),{headers:{...headers,"Content-Length":String(asset.bytes.byteLength)}});
}
/** One public request instead of optimizer -> HTTP original -> database. */
export async function serveProductImage(request: Request,id: string,load:()=>Promise<Asset|null>) {
  const unavailable=(status:number)=>new Response(null,{status,headers:{"Cache-Control":"no-store"}});
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return unavailable(404);
  const q=new URL(request.url).searchParams;
  const resize=q.has('w') || q.has('format');
  const width=Number(q.get('w'));
  if(resize && (q.get('format')!=='webp' || !PRODUCT_IMAGE_WIDTHS.some(w=>w===width))) return unavailable(400);
  const key=`product:${id}:webp75:${width}`;
  try {
    const cached=resize ? peekPublicMedia(key) : peekPublicMedia(id);
    if(cached) return reply(request,cached);
    // Do not nest shared-cache jobs; preserve its bounded admission policy.
    const original=await readPublicMedia(id,load);
    if(!original) return unavailable(404);
    if(!resize || !['image/jpeg','image/png','image/webp','image/avif'].includes(original.contentType)) return reply(request,original);
    const image=await readPublicMedia(key,async()=>({bytes:new Uint8Array(await sharp(original.bytes,{limitInputPixels:40_000_000,failOn:'error'}).rotate().resize({width,withoutEnlargement:true}).webp({quality:75,alphaQuality:100,effort:3}).toBuffer()),contentType:'image/webp'}));
    return image ? reply(request,image) : unavailable(503);
  } catch { return unavailable(503); }
}
