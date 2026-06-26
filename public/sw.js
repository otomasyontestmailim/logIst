/**
 * Lojistik CRM — Service Worker
 * Strateji:
 *   - Supabase / API çağrıları → Network first (offline'da eski cache)
 *   - Statik varlıklar (/_next/static/) → Cache first, 30 gün
 *   - Diğer istekler → Network first, 24 saat
 *   - Offline fallback → /offline sayfası
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `lojistik-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `lojistik-dynamic-${CACHE_VERSION}`;

const STATIC_PRECACHE = ["/offline"];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (e.g. Supabase storage) — let them pass through.
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Next.js static chunks → cache first (immutable content hashes)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // API routes and auth → always network, no cache
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/sign-out")
  ) {
    return; // default browser handling
  }

  // All other page requests → network first with offline fallback
  event.respondWith(networkFirstWithFallback(request));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Offline fallback for HTML navigation requests
    if (request.headers.get("accept")?.includes("text/html")) {
      const fallback = await caches.match("/offline");
      if (fallback) return fallback;
    }
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}
