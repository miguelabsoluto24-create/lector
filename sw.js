/* Lector Nocturno: guarda la app para usarla sin internet.
   La primera vez que se abre hay que tener conexión; después funciona sin ella.
   Si cambias algo de la app, sube el número de VERSION para que los teléfonos se actualicen. */
const VERSION = "v35";
const CACHE = "lector-nocturno-" + VERSION;

const LOCAL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "fonts/comic-400-italic.woff",
  "fonts/comic-400-normal.woff",
  "fonts/comic-700-italic.woff",
  "fonts/comic-700-normal.woff",
  "fonts/dyslexic-400-italic.woff",
  "fonts/dyslexic-400-normal.woff",
  "fonts/dyslexic-700-italic.woff",
  "fonts/dyslexic-700-normal.woff",
  "fonts/roboto-400-italic.woff",
  "fonts/roboto-400-normal.woff",
  "fonts/roboto-700-italic.woff",
  "fonts/roboto-700-normal.woff"
];

const REMOTE = [
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  "https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js",
  "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap"
];

const HOSTS = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(LOCAL);
    // Las librerías externas se intentan guardar; si una falla, se guardará al usarla.
    await Promise.all(REMOTE.map((url) =>
      cache.add(new Request(url, { mode: "no-cors" })).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE && k.startsWith("lector-nocturno-")).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !HOSTS.includes(url.hostname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) {
      // Archivos propios: se sirven al instante y se actualizan en segundo plano.
      if (sameOrigin) {
        fetch(req).then((res) => { if (res && res.ok) cache.put(req, res); }).catch(() => {});
      }
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === "navigate") {
        const fallback = (await cache.match("index.html")) || (await cache.match("./"));
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
