// ============================================================
//  Vibe Travel — Service Worker
//  Handles: caching, offline shell, saved itineraries sync
// ============================================================

const CACHE_NAME   = 'vibe-travel-v1';
const OFFLINE_URL  = '/travelai/';

const PRECACHE = [
  '/travelai/',
  '/travelai/index.html',
  '/travelai/manifest.json',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap'
];

// ── INSTALL — precache app shell ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE — clean old caches ──────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — network first, cache fallback ────────────────────
self.addEventListener('fetch', event => {
  // Don't intercept Cloudflare Worker API calls
  if (event.request.url.includes('workers.dev')) return;

  // For navigation requests — serve app shell if offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL)
      )
    );
    return;
  }

  // For fonts and static assets — cache first
  if (
    event.request.url.includes('fonts.googleapis.com') ||
    event.request.url.includes('fonts.gstatic.com') ||
    event.request.destination === 'style' ||
    event.request.destination === 'script'
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── SHARE TARGET (Web Share Target API) ─────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method === 'POST' && event.request.url.includes('share-target')) {
    event.respondWith(Response.redirect('/travelai/', 303));
  }
});
