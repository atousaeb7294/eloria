const CACHE_NAME = "eloria-shell-v2-brand-media";
const SHELL = [
  "/fa",
  "/manifest.webmanifest",
  "/icons/eloria-192.png",
  "/icons/eloria-512.png",
  "/images/hero/eloria-hero.jpeg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/admin") ||
    url.pathname.includes("/checkout") ||
    url.pathname.includes("/profile")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          void caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // A failed image must not receive HTML as its fallback response.
        if (request.mode === "navigate") {
          const home = await caches.match("/fa");
          if (home) return home;
        }
        return Response.error();
      }),
  );
});
