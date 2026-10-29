import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import sharp from 'sharp';
import {serveHeroImage} from '../src/lib/hero-image-response';
import {serveProductImage} from '../src/lib/product-image-response';
import {readPublicMedia,peekPublicMedia,invalidatePublicMedia} from '../src/lib/public-media-cache';
import {createMediaFlight} from '../src/lib/media-flight';
import {localMediaLoader} from '../src/lib/local-media-loader';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PreparedGalleryImage} from '../src/components/prepared-gallery-image';
import {FloatingProductImage} from '../src/components/floating-product-image';
async function main(){
 const flight=createMediaFlight(3,32);let active=0,peak=0,operations=0;let release!:()=>void;
 const gate=new Promise<void>(r=>{release=r});
 const work=()=>flight('shared',async()=>{operations++;await gate;return 42});const one=work(),two=work();assert.equal(one,two);release();assert.equal(await one,42);assert.equal(operations,1);
 await Promise.all(Array.from({length:20},(_,i)=>flight('item'+i,async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,4));active--;return i})));assert.equal(peak,3);
 const bound=createMediaFlight(1,2);let unblock!:()=>void;const waiting=new Promise<void>(r=>unblock=r);const hold=bound('a',()=>waiting);const hold2=bound('b',async()=>{});await assert.rejects(bound('c',async()=>{}));unblock();await Promise.all([hold,hold2]);
 invalidatePublicMedia();let oldResolve!:(v:{bytes:Uint8Array,contentType:string})=>void;const old=readPublicMedia('old',()=>new Promise(r=>oldResolve=r));await Promise.resolve();invalidatePublicMedia();oldResolve({bytes:new Uint8Array([1]),contentType:'image/webp'});await old;assert.equal(peekPublicMedia('old'),null);
 const id='12345678-1234-4234-8234-123456789abc';const base=`https://eloriagallery.ir/api/media/products/${id}`;
 const bytes=await sharp(randomBytes(1100*1000*3),{raw:{width:1100,height:1000,channels:3}}).png().toBuffer();assert(bytes.length>2*1024*1024);let loads=0;
 const load=async()=>{loads++;return {bytes,contentType:'image/png'}};const req=new Request(base+'?w=480&format=webp');
 const r=await serveProductImage(req,id,load);assert.equal(r.status,200);assert.equal(r.headers.get('X-Eloria-Media-Cache'),'miss');const variant=Buffer.from(await r.arrayBuffer());assert.equal((await sharp(variant).metadata()).width,480);assert(r.headers.has('server-timing'));
 const again=await serveProductImage(req,id,load);assert.equal(again.headers.get('X-Eloria-Media-Cache'),'hit');assert.equal(loads,1);
 assert.equal((await serveProductImage(new Request(req.url,{headers:{'if-none-match':again.headers.get('etag')!}}),id,load)).status,304);
 assert.equal((await serveProductImage(new Request(base+'?w=999999&format=webp'),id,load)).status,400);
 const original=await serveProductImage(new Request(base),id,load);assert.deepEqual(Buffer.from(await original.arrayBuffer()),bytes);
 invalidatePublicMedia();const alpha=await sharp({create:{width:800,height:800,channels:4,background:{r:100,g:80,b:150,alpha:0.5}}}).png().toBuffer();let heroLoads=0;const heroLoad=async()=>{heroLoads++;return alpha;};
 const hr=new Request(`https://eloriagallery.ir/api/media/hero/${id}?w=480&format=webp`);const h=await serveHeroImage(hr,id,heroLoad);assert.equal(h.status,200);assert.equal((await sharp(Buffer.from(await h.arrayBuffer())).metadata()).hasAlpha,true);await serveHeroImage(hr,id,heroLoad);assert.equal(heroLoads,1);
 assert(localMediaLoader(`/api/media/hero/${id}`)!({src:`/api/media/hero/${id}`,width:400}).includes('format=webp'));assert(localMediaLoader(`/api/media/products/${id}`));assert.equal(localMediaLoader('https://example.com/image.jpg'),undefined);
 const gallery=renderToStaticMarkup(createElement(PreparedGalleryImage,{images:[{imageUrl:`/api/media/products/${id}`,alt:'chosen'},{imageUrl:'/unused.jpg',alt:'unused'}],index:0,sizes:'300px',className:'photo',locale:'en'}));assert(gallery.includes('alt="chosen"'));assert(!gallery.includes('/unused.jpg'));assert(!gallery.includes('/_next/image'));
 const heroMarkup=renderToStaticMarkup(createElement(FloatingProductImage,{src:'unused',cutoutSrc:`/api/media/hero/${id}`,alt:'hero',sizes:'90vw',priority:true}));assert(heroMarkup.includes('w=480'));assert(!heroMarkup.includes('w=1280'));
 const now=Date.now;let clock=100000;Date.now=()=>clock;try{invalidatePublicMedia();await readPublicMedia('long',async()=>({bytes:new Uint8Array([1]),contentType:'image/webp'}),{maxAgeMs:3600000});clock+=61000;assert(peekPublicMedia('long'));clock+=3600000;assert.equal(peekPublicMedia('long'),null);}finally{Date.now=now;}
 console.log('PASS: 20 concurrent image jobs, queue bound, single-flight, invalidation, resized/original delivery, alpha, hot-cache, ETag, input validation, timing headers, long-lived variants and direct hero loader.');
 console.log(`Synthetic source ${bytes.length} bytes; 480px WebP ${variant.length} bytes.`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
