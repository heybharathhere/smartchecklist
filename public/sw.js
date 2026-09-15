/* Smart Checklist service worker.
 *
 * Built assets carry content hashes, so their names are unknown at build time.
 * Rather than generate a precache manifest, the shell is precached by relative
 * path and everything else is cached as it is first requested. That keeps the
 * worker dependency-free and correct for any deployment sub-path.
 */

const VERSION = 'v1';
const SHELL_CACHE = `smart-checklist-shell-${VERSION}`;
const ASSET_CACHE = `smart-checklist-assets-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

function offlineShell() {
  return caches.match('./index.html', { cacheName: SHELL_CACHE }).then(
    (response) =>
      response ||
      new Response(
        '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font:14px system-ui;padding:2rem">Smart Checklist is not cached yet. Reconnect once and it will work offline afterwards.</body>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      ),
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // App navigation: network first so a new deploy is picked up, cache as backup.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => offlineShell()),
    );
    return;
  }

  // Cross-origin (fonts): cache-first, and never fail the page over it.
  if (!sameOrigin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((response) => {
              if (response.ok || response.type === 'opaque') {
                const copy = response.clone();
                caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
              }
              return response;
            })
            .catch(() => new Response('', { status: 504 })),
      ),
    );
    return;
  }

  // Hashed build output and icons: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || offlineShell());
      return cached || network;
    }),
  );
});
