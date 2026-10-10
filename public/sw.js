// Never cache documents, API, videos or financial/authentication responses.
const CACHE_NAME = "eloria-assets-v3-20261010";
const OFFLINE = "/offline.html";
const MAX_ENTRIES = 64;
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const STORED_AT = "x-eloria-cache-time";
let writes = Promise.resolve();

function cacheablePath(url) {
  return !url.search && /^(\/_next\/static\/|\/images\/|\/fonts\/|\/icons\/)/.test(url.pathname);
}
async function storeAsset(request, response) {
  const control = response.headers.get("cache-control") || "";
  if (!response.ok || response.type !== "basic" || /private|no-store/i.test(control)) return;
  const length = Number(response.headers.get("content-length"));
  // Unknown/chunked or large assets remain network-only, avoiding unbounded buffers.
  if (!length || length > 2 * 1024 * 1024) return;
  const body = await response.arrayBuffer();
  if (body.byteLength > 2 * 1024 * 1024) return;
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.set("content-length", String(body.byteLength));
  headers.set(STORED_AT, String(Date.now()));
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, new Response(body, { status: 200, headers }));
  const keys = await cache.keys();
  let size = 0, count = 0;
  // Retain newer entries within both byte and count budgets.
  for (const key of keys.reverse()) {
    if (new URL(key.url).pathname === OFFLINE) continue;
    const item = await cache.match(key);
    size += Number(item?.headers.get("content-length") || 0);
    count++;
    if (count > MAX_ENTRIES || size > MAX_BYTES || Date.now() - Number(item?.headers.get(STORED_AT) || 0) > MAX_AGE_MS) await cache.delete(key);
  }
}
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.add(OFFLINE)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("eloria-") && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
    return;
  }
  if (!cacheablePath(url)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      const copy = response.clone();
      writes = writes.then(() => storeAsset(request, copy)).catch(() => {});
      event.waitUntil(writes);
      return response;
    } catch {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached && Date.now() - Number(cached.headers.get(STORED_AT) || 0) <= MAX_AGE_MS) return cached;
      await cache.delete(request);
      return Response.error();
    }
  })());
});
