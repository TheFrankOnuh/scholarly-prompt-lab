/* Scholarly Prompt Lab: offline support.
   Keeps a copy of the Lab's own files on the device so it opens without a connection.
   It never touches the researcher's data and never contacts any other site. The visit counter is a separate file. */
importScripts("release.js");
// The saved copy belongs to exactly one release. A new release makes a new copy and removes the old one.
const CACHE = "spl-" + self.LAB_RELEASE.version;
const CORE = [
  "./", "index.html", "release.js", "styles.css", "app.js", "ui.js", "checks.js", "data.js", "theories.js", "theory-links.js", "disciplines.js", "procedures.js", "community.js", "report.js", "tour.js", "projects.js", "offline.js", "counter.js",
  "manifest.webmanifest", "assets/logo/wordmark.svg", "assets/logo/wordmark-on-dark.svg", "icons/icon-192.png", "icons/icon-512.png",
  "vendor/pdfjs/pdf.min.mjs", "vendor/pdfjs/pdf.worker.min.mjs", "vendor/mammoth/mammoth.browser.min.js"
];

self.addEventListener("install", (event) => {
  // All or nothing: if any file cannot be saved, this copy is not installed and the previous one stays in use.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE.map((url) => new Request(url, { cache: "reload" })))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// The page asks whether the saved copy is complete before telling the researcher it works offline.
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "status") return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const missing = [];
    for (const url of CORE) { if (!(await cache.match(url, { ignoreSearch: true }))) missing.push(url); }
    event.source.postMessage({ type: "status", version: self.LAB_RELEASE.version, files: CORE.length, missing });
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Online: always the newest files, all from the same release. Offline: the saved copy, which is one complete release.
  // Files fetched while online are deliberately not added to the saved copy, so it can never mix two releases.
  event.respondWith((async () => {
    try {
      return await fetch(req);
    } catch (e) {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      return cached || new Response("Offline, and this file is not in the saved copy.", { status: 503, headers: { "Content-Type": "text/plain" } });
    }
  })());
});
