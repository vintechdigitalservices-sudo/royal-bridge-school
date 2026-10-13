/* ROYALBRIDGE INT'L SCHOOL — service worker
   Strategy:
   - Precache the static application shell (HTML/CSS/JS/icons/logo/audio).
   - Cache-first for same-origin static GET assets.
   - Network-only for API/backend requests (never cache auth, payments or dynamic data).
   - Offline fallback page when a navigation request fails.
*/
const CACHE_VERSION = "rbi-portal-v3";
const OFFLINE_URL = "offline.html";

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./assets/css/style.css",
  "./assets/css/components.css",
  "./assets/css/responsive.css",
  "./assets/images/logo.jpg",
  "./assets/images/icon-192.png",
  "./assets/images/icon-512.png",
  "./assets/images/icon-maskable-512.png",
  "./assets/audio/notification-chime.wav",
  "./assets/js/app.js",
  "./assets/js/auth.js",
  "./assets/js/config.js",
  "./assets/js/db.js",
  "./assets/js/seed.js",
  "./assets/js/storage.js",
  "./assets/js/services.js",
  "./assets/js/navigation.js",
  "./assets/js/modal.js",
  "./assets/js/forms.js",
  "./assets/js/utils.js",
  "./assets/js/paths.js",
  "./assets/js/notifications.js",
  "./assets/js/notification-center.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => Promise.all(
        PRECACHE_ASSETS.map((url) => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isSensitive(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return true; // never cache third-party/API calls
  if (/\/(api|auth|login|payments?|webhook)\b/i.test(url.pathname)) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET; let the browser handle the rest (never intercept auth/payment posts).
  if (request.method !== "GET") return;

  // Network-only for sensitive or cross-origin requests.
  if (isSensitive(request)) return;

  // Navigation requests: network-first, fall back to cache then offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static same-origin assets: cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
