/* Nina service worker — network-first; never trap users on Offline.html for dead tunnels */
const CACHE_VERSION = "nina-v1-2-stable";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";

/** Hosts that must NOT use aggressive offline caching (ephemeral tunnels). */
function isEphemeralHost(hostname) {
  return (
    hostname.endsWith(".trycloudflare.com") ||
    hostname.endsWith(".loca.lt") ||
    hostname.endsWith(".localtunnel.me") ||
    hostname.endsWith(".lhr.life") ||
    hostname.endsWith(".localhost.run") ||
    hostname.endsWith(".serveo.net") ||
    hostname.endsWith(".serveousercontent.com") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // On ephemeral hosts, skip precache — avoid sticky offline shells
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
        keys
          .filter((k) => k.startsWith("nina-") && k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      // Ephemeral hosts: drop ALL nina caches so a dead tunnel cannot show Offline forever
      if (isEphemeralHost(self.location.hostname)) {
        await Promise.all(keys.filter((k) => k.startsWith("nina-")).map((k) => caches.delete(k)));
      }
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/splash/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2")
  );
}

function isApiOrAuth(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/api/auth") ||
    url.pathname.startsWith("/pt/login") ||
    url.pathname.startsWith("/pt/registo") ||
    url.pathname.startsWith("/en/login") ||
    url.pathname.startsWith("/en/registo")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const ephemeral = isEphemeralHost(url.hostname);

  // Ephemeral / auth / API: always network, never offline.html trap
  if (ephemeral || isApiOrAuth(url)) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            "<!doctype html><meta charset=utf-8><title>Nina</title><p>Servidor indisponível. Atualiza a página ou usa o URL estável da Vercel.</p><p><a href='/pt/login'>Tentar login</a></p>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          ),
      ),
    );
    return;
  }

  // Static: cache-first only on stable hosts
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      }),
    );
    return;
  }

  // Navigations: network-first; offline fallback only on stable production hosts
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return (
            (await caches.match(OFFLINE_URL)) ||
            new Response("Nina indisponível", { status: 503 })
          );
        }
      })(),
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((c) => c || Response.error())),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "NUKE_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});
