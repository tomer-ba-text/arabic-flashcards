// Bump VERSION on every deploy so phones drop the old cache.
const VERSION = 'v2';
const CACHE = 'vocab-quiz-' + VERSION;
const ASSETS = ['./', './index.html', './manifest.json', './icon.png'];

// Precache everything on install, so the app works offline from the first launch.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const refresh = async (cache, req) => {
  const res = await fetch(req);
  if (res && res.ok && res.type === 'basic') await cache.put(req, res.clone());
  return res;
};

// Stale-while-revalidate: answer from cache instantly (works offline and on bad
// signal), refresh the cache in the background so the next launch gets updates.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isPage = req.mode === 'navigate';
    const cached = isPage
      ? (await cache.match('./index.html')) || (await cache.match('./'))
      : await cache.match(req, { ignoreSearch: true });
    const network = refresh(cache, isPage ? './index.html' : req);
    if (cached) {
      e.waitUntil(network.catch(() => {}));
      return cached;
    }
    return network;
  })());
});
