/* Scholarly Prompt Lab: offline support.
   Keeps a copy of the Lab's own files on the device so it opens without a connection.
   It never touches the researcher's data and never contacts any other site. */
const CACHE = "spl-v4";
const CORE = [
  "./", "index.html", "styles.css", "app.js", "checks.js", "data.js", "theories.js", "theory-links.js", "disciplines.js", "procedures.js", "community.js", "report.js", "tour.js", "offline.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
  "vendor/pdfjs/pdf.min.mjs", "vendor/pdfjs/pdf.worker.min.mjs", "vendor/mammoth/mammoth.browser.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // add one by one so a single failure does not stop the rest
      Promise.all(CORE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network first, so people online always get the newest version of every file together.
  // The saved copy is used only when the network request fails, which is what happens offline.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(url.origin + url.pathname, res.clone());
      return res;
    } catch (e) {
      const cached = await cache.match(req, { ignoreSearch: true });
      return cached || new Response("Offline and not yet saved on this device.", { status: 503, headers: { "Content-Type": "text/plain" } });
    }
  })());
});
