import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const events={}; const saved=new Map(); let networkFails=false, privateResponse=false;
function networkResponse(){ const r=new Response('asset',{headers:{'content-length':'5','cache-control':privateResponse?'private, no-store':'public'}});Object.defineProperty(r,'type',{value:'basic'});Object.defineProperty(r,'clone',{value:networkResponse});return r; }
const cachesByName=new Map([['eloria-shell-v2-brand-media',new Map()],['another-app',new Map()]]);
const key=req=>typeof req==='string'?req:req.url;
const cache={
  add:async url=>saved.set(url,new Response('offline')),
  put:async(req,res)=>saved.set(key(req),res),
  match:async req=>saved.get(key(req)),
  delete:async req=>saved.delete(key(req)),
  keys:async()=>Array.from(saved.keys()).map(url=>({url:new URL(url,'https://shop.test').href})),
};
runInNewContext(readFileSync('public/sw.js','utf8'),{
  self:{location:{origin:'https://shop.test'},addEventListener:(name,fn)=>events[name]=fn,skipWaiting(){},clients:{claim:async()=>{}}},
  caches:{open:async()=>cache,keys:async()=>Array.from(cachesByName.keys()),delete:async name=>cachesByName.delete(name),match:async req=>cache.match(req)},
  fetch:async()=>{if(networkFails)throw Error('offline');return networkResponse();},
  URL,Headers,Response,Date,console,
});
async function lifecycle(name){let task;events[name]({waitUntil:p=>task=p});await task;}
await lifecycle('install'); await lifecycle('activate');
assert.ok(!cachesByName.has('eloria-shell-v2-brand-media')); assert.ok(cachesByName.has('another-app'));
async function request(path,mode='cors') {
  let response; const tasks=[];
  events.fetch({request:{method:'GET',url:'https://shop.test'+path,mode},respondWith:p=>response=p,waitUntil:p=>tasks.push(p)});
  const result=await response; await Promise.all(tasks); return result;
}
for(const path of ['/api/products/x/price','/api/media/products/x','/videos/intro.mp4','/login','/cart','/images/x.webp?token=private'])assert.equal(await request(path),undefined);
await request('/fa/products/x','navigate'); assert.equal(saved.size,1,'Online documents never cached');
await request('/images/valid.webp'); assert.ok(saved.has('https://shop.test/images/valid.webp'));
privateResponse=true; await request('/images/private.webp'); assert.ok(!saved.has('https://shop.test/images/private.webp')); privateResponse=false;
for(let i=0;i<70;i++)await request(`/images/${i}.webp`); assert.ok(saved.size<=65,'Cache entry cap plus offline document');
networkFails=true; assert.equal(await (await request('/fa/checkout','navigate')).text(),'offline');
assert.equal((await request('/images/missing.webp')).type,'error','Images never receive HTML fallback');
console.log('PASS: old app cache removed, other caches preserved, API/auth/cart/video bypassed, documents network-only, honest offline fallback');
