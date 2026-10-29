// Public, read-only timing check. No .env loading, login, or database access.
const base = 'https://eloriagallery.ir';
const response = await fetch(base+'/fa', {signal:AbortSignal.timeout(30000)});
if(!response.ok) throw Error(`Home returned ${response.status}`);
const html=await response.text();
const hero=html.match(/\/api\/media\/hero\/[0-9a-f-]{36}/i)?.[0];
const product=html.match(/\/api\/media\/products\/[0-9a-f-]{36}/i)?.[0];
const targets=[['health','/api/health?mode=live'],...(hero?[['hero',hero+'?w=480&format=webp']]:[]),...(product?[['product',product+'?w=480&format=webp']]:[])];
for(const [label,url] of targets) for(let repeat=1;repeat<=2;repeat++){
 const start=performance.now();
 try {
  const r=await fetch(base+url,{signal:AbortSignal.timeout(30000)});
  const first=performance.now()-start;const bytes=await r.arrayBuffer();
  console.log(JSON.stringify({image:label,repeat,status:r.status,firstByteMs:Math.round(first),totalMs:Math.round(performance.now()-start),bytes:bytes.byteLength,serverTiming:r.headers.get('server-timing'),cache:r.headers.get('x-eloria-media-cache')}));
 } catch(e){console.log(JSON.stringify({image:label,repeat,error:e.name}));}
}
