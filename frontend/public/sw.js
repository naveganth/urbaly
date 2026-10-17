/**
 * Urbaly service worker — app-shell caching + offline tolerance.
 *
 * Strategies:
 *   navigations              network-first; per-pathname HTML fallback (queries
 *                            like ?q= are client-side state, so /mapa?q=x and
 *                            /mapa share one shell entry)
 *   /_next/static/*          cache-first (hashed + immutable within a deploy)
 *   /api/* (GET only)        network-first with cached fallback
 *   same-origin assets       stale-while-revalidate (svgs, icons, the MapLibre
 *                            worker, …)
 *   tiles.openfreemap.org    stale-while-revalidate (keyless basemap tiles,
 *                            styles, sprites, glyphs)
 *   urbalycdn… (report imgs) stale-while-revalidate
 *   POST / anything else     passthrough — Server Actions are never cached
 *
 * The offline page and every asset it references are precached at install, so
 * even a first-visit-while-offline user gets a styled page. Bump VERSION to
 * invalidate all caches (e.g. after changing these strategies).
 *
 * MapLibre CANNOT be fully offline (uncached tiles need the network); the goal
 * here is shell + last-seen data, with the app's own offline banner covering
 * the gap.
 */

const VERSION = 'v2';
const SHELL_CACHE = `urbaly-shell-${VERSION}`;
const ASSET_CACHE = `urbaly-assets-${VERSION}`;
const DATA_CACHE = `urbaly-data-${VERSION}`;
const MEDIA_CACHE = `urbaly-media-${VERSION}`;
const TILE_CACHE = `urbaly-tiles-${VERSION}`;

const KEEP_CACHES = [SHELL_CACHE, ASSET_CACHE, DATA_CACHE, MEDIA_CACHE, TILE_CACHE];

const SHELL_LIMIT = 30;
const ASSET_LIMIT = 80;
const DATA_LIMIT = 20;
const MEDIA_LIMIT = 80;
const TILE_LIMIT = 150;

const OFFLINE_URL = '/offline';
const PRECACHE_URLS = [OFFLINE_URL, '/UrbalySquareLogoTransparent.svg'];

// Same-origin files served from public/ or app routes: svg/png/…/fonts/worker.
const ASSET_EXTENSIONS =
  /\.(?:svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|mjs|js|css|webmanifest)$/i;

const TILE_HOST = 'tiles.openfreemap.org';
const MEDIA_HOST = 'urbalycdn.gabrielataide.com';

/* ---------------------------------------------------------------- */
/* Install / activate                                               */
/* ---------------------------------------------------------------- */

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  // Take over as soon as possible; navigations are network-first, so a new
  // worker can never serve older HTML than the network when online.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.all(
          names.filter((name) => !KEEP_CACHES.includes(name)).map((name) => caches.delete(name))
        );
      } catch {
        // Cleanup is best-effort; stale caches are harmless.
      }
      await self.clients.claim();
    })()
  );
});

// Reserved for a future "update available" prompt; there is no forced prompt
// today because network-first navigations already pick up new HTML.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/**
 * Precaches the offline page plus the hashed /_next/static assets it links
 * (CSS, fonts, hydration chunks) so the fallback renders fully styled even on
 * a device that has never completed a page load.
 */
async function precache() {
  const results = await Promise.allSettled(
    PRECACHE_URLS.map(async (url) => {
      const response = await fetch(url, { cache: 'reload' });
      if (!response || !response.ok) return;
      const target = url === OFFLINE_URL ? SHELL_CACHE : ASSET_CACHE;
      const cache = await caches.open(target);
      await cache.put(url, response.clone());
      if (url === OFFLINE_URL) {
        const html = await response.text();
        await precacheReferencedAssets(html);
      }
    })
  );
  void results;
}

async function precacheReferencedAssets(html) {
  const refs = new Set();
  const pattern = /(?:src|href)="(\/_next\/static\/[^"]+)"/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    refs.add(match[1].replace(/&amp;/g, '&'));
  }
  if (refs.size === 0) return;
  const cache = await caches.open(ASSET_CACHE);
  await Promise.allSettled(
    [...refs].map(async (url) => {
      const response = await fetch(url, { cache: 'reload' });
      if (response && response.ok) await cache.put(url, response.clone());
    })
  );
}

/* ---------------------------------------------------------------- */
/* Fetch routing                                                    */
/* ---------------------------------------------------------------- */

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Server Actions (report submit, auth) are POSTs — never intercept them.
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(request, url));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/_next/static/')) {
      event.respondWith(cacheFirst(request, ASSET_CACHE, ASSET_LIMIT));
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirst(request, DATA_CACHE, DATA_LIMIT));
      return;
    }
    // RSC payloads (?\_rsc=) and dynamic routes have no file extension and
    // fall through to the network untouched.
    if (ASSET_EXTENSIONS.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, ASSET_CACHE, ASSET_LIMIT));
    }
    return;
  }

  if (url.hostname === TILE_HOST) {
    event.respondWith(staleWhileRevalidate(request, TILE_CACHE, TILE_LIMIT));
    return;
  }
  if (url.hostname === MEDIA_HOST) {
    event.respondWith(staleWhileRevalidate(request, MEDIA_CACHE, MEDIA_LIMIT));
    return;
  }
  // CARTO fallback basemap (keyed URLs) and everything else: network only.
});

/**
 * Navigations: network-first, falling back to the last cached copy of the
 * same path (any query string), then to the precached offline page.
 */
async function handleNavigate(request, url) {
  const cacheKey = url.origin + url.pathname;
  try {
    const response = await fetch(request);
    const type = response.headers.get('content-type') || '';
    if (response.status === 200 && type.includes('text/html')) {
      void writeCache(SHELL_CACHE, cacheKey, response.clone(), SHELL_LIMIT);
    }
    return response;
  } catch {
    const cache = await openCache(SHELL_CACHE);
    if (cache) {
      const cached = await matchCache(cache, cacheKey);
      if (cached) return cached;
      const offline = await matchCache(cache, new URL(OFFLINE_URL, self.location.origin).href);
      if (offline) return offline;
    }
    return new Response(FALLBACK_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await openCache(cacheName);
  const cached = cache ? await matchCache(cache, request) : null;
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && cache) {
      void writeCache(cacheName, request, response.clone(), limit);
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function networkFirst(request, cacheName, limit) {
  const cache = await openCache(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok && cache) {
      void writeCache(cacheName, request, response.clone(), limit);
    }
    return response;
  } catch {
    const cached = cache ? await matchCache(cache, request) : null;
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName, limit) {
  const cache = await openCache(cacheName);
  const cached = cache ? await matchCache(cache, request) : null;
  const update = fetch(request)
    .then((response) => {
      // Opaque cross-origin responses (status 0, e.g. no-cors <img>) are
      // cacheable and serve images fine; error statuses are not stored.
      if (cache && (response.ok || response.type === 'opaque')) {
        void writeCache(cacheName, request, response.clone(), limit);
      }
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  const fresh = await update;
  return fresh || Response.error();
}

/* ---------------------------------------------------------------- */
/* Cache helpers                                                    */
/* ---------------------------------------------------------------- */

async function openCache(name) {
  try {
    return await caches.open(name);
  } catch {
    return null;
  }
}

async function matchCache(cache, key) {
  try {
    return (await cache.match(key)) || null;
  } catch {
    return null;
  }
}

/** Best-effort write + FIFO trim; caching failures never break a response. */
async function writeCache(cacheName, key, response, limit) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(key, response);
    const keys = await cache.keys();
    const excess = keys.length - limit;
    for (let index = 0; index < excess; index += 1) {
      await cache.delete(keys[index]);
    }
  } catch {
    // Storage disabled / quota exceeded — request already succeeded.
  }
}

const FALLBACK_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sem conexão | Urbaly</title><style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#fff;color:#18181b;text-align:center}main{max-width:20rem;padding:1.5rem}p{color:#71717a}</style></head><body><main><h1>Você está offline</h1><p>Sua conexão caiu. Reconecte e tente novamente.</p></main></body></html>`;
