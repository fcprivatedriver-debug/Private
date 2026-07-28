/* Mel service worker — network-first + lembretes locais */
const CACHE_VERSION = "mel-v2";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const OFFLINE_URL = "/offline.html";

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const reminderTimers = new Map();

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

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "SCHEDULE_REMINDER") return;
  const { id, title, body, fireAt } = data;
  const prev = reminderTimers.get(id);
  if (prev) clearTimeout(prev);
  const delay = Math.max(0, Number(fireAt) - Date.now());
  const timer = setTimeout(() => {
    reminderTimers.delete(id);
    self.registration
      .showNotification(title || "Mel", {
        body: body || "",
        tag: id,
        renotify: true,
      })
      .catch(() => {});
  }, delay);
  reminderTimers.set(id, timer);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow("/pt/hoje");
    })(),
  );
});
