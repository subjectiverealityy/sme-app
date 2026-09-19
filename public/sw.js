/*
 * Credyt service worker — offline-first app shell.
 *
 * Caching strategy:
 *   - Install: precache the app shell (landing + offline page + manifest + icons)
 *   - Navigation requests: network-first, fall back to cache, then /offline
 *   - /_next/static assets: stale-while-revalidate (hashed, cache-first)
 *   - /api requests: never cached (fresh Supabase/Groq data only)
 *   - Everything else same-origin: network-first with cache fallback
 *
 * Bump CACHE_VERSION to force a full re-precache on deploy.
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `credyt-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { mode: "same-origin" });
            if (res.ok) await cache.put(url, res);
          } catch {
            /* offline install or slow server — tolerate */
          }
        })
      );
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

const isGet = (request) => request.method === "GET";
const isApi = (url) => url.pathname.startsWith("/api/");
const isStatic = (url) => url.pathname.startsWith("/_next/static/");
const isNavigation = (request) =>
  request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");

async function openCache() {
  return caches.open(CACHE_NAME);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!isGet(request) || url.origin !== self.location.origin) return;
  if (isApi(url)) return; // network only — never serve stale data

  // Navigation: network-first, cache fallback, then the offline page
  if (isNavigation(request)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await openCache();
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch {
          const cache = await openCache();
          const cached = await cache.match(request);
          if (cached) return cached;
          const offline = await cache.match("/offline");
          return offline || Response.error();
        }
      })()
    );
    return;
  }

  // Hashed build assets: cache-first, refresh in the background
  if (isStatic(url)) {
    event.respondWith(
      (async () => {
        const cache = await openCache();
        const cached = await cache.match(request);
        const refresh = fetch(request)
          .then(async (res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || refresh;
      })()
    );
    return;
  }

  // Everything else same-origin (e.g. images): network-first with cache fallback
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(request);
        if (res.ok) {
          const cache = await openCache();
          cache.put(request, res.clone());
        }
        return res;
      } catch {
        const cache = await openCache();
        return (await cache.match(request)) || (await cache.match("/offline"));
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});