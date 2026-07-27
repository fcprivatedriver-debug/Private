/* Mel service worker — network-first */
const CACHE_VERSION = "mel-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const OFFLINE_URL = "/offline.html";

function isEphemeralHost(hostname) {
  return (
    hostname.endsWith(".trycloudflare.com") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      if (!isEphemeralHost(self.location.hostname)) {
        const cache = await caches.open(SHELL_CACHE);
        await cache.addAll([OFFLINE_URL, "/manifest.webmanifest"]).catch(() => {});
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (isEphemeralHost(self.location.hostname)) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        return fresh;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request);
        return cached || cache.match(OFFLINE_URL);
      }
    })(),
  );
});
