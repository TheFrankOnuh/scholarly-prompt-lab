/* Scholarly Prompt Lab: offline support.
   Keeps a copy of the Lab's own files on the device so it opens without a connection.
   It never touches the researcher's data and never contacts any other site. The visit counter is a separate file. */
importScripts("release.js");
// The saved copy belongs to exactly one release. A new release makes a new copy and removes the old one.
const CACHE = "spl-" + self.LAB_RELEASE.version;
const CORE = [
  "./", "index.html", "locales.js", "i18n.js", "release.js", "styles.css", "app.js", "ui.js", "checks.js", "data.js", "theories.js", "theory-links.js", "disciplines.js", "procedures.js", "community.js", "report.js", "tour.js", "projects.js", "protocol.js", "conversations.js", "offline.js", "counter.js",
  "manifest.webmanifest", "assets/fonts/fonts.css", "assets/logo/wordmark.svg", "assets/logo/wordmark-on-dark.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png",
  "vendor/pdfjs/pdf.min.mjs", "vendor/pdfjs/pdf.worker.min.mjs", "vendor/mammoth/mammoth.browser.min.js"
];

// The typefaces are kept apart from the release copy, in a cache of their own that later releases reuse.
// Latin and Latin Extended are saved at installation. Greek, Cyrillic and Vietnamese are saved the first time a page uses them.
// If the fonts cannot be saved, the Lab still installs and works offline, using the device's own fonts.
const FONT_CACHE = "spl-fonts-1"; // change only when the font files themselves change
const FONTS = [
  "assets/fonts/ibm-plex-mono-normal-400-latin-ext.woff2", "assets/fonts/ibm-plex-mono-normal-400-latin.woff2", "assets/fonts/ibm-plex-mono-normal-500-latin-ext.woff2", "assets/fonts/ibm-plex-mono-normal-500-latin.woff2", "assets/fonts/ibm-plex-sans-italic-400-latin-ext.woff2", "assets/fonts/ibm-plex-sans-italic-400-latin.woff2", "assets/fonts/ibm-plex-sans-normal-400-latin-ext.woff2", "assets/fonts/ibm-plex-sans-normal-400-latin.woff2", "assets/fonts/ibm-plex-sans-normal-500-latin-ext.woff2", "assets/fonts/ibm-plex-sans-normal-500-latin.woff2", "assets/fonts/ibm-plex-sans-normal-600-latin-ext.woff2", "assets/fonts/ibm-plex-sans-normal-600-latin.woff2", "assets/fonts/source-serif-4-italic-400-700-latin-ext.woff2", "assets/fonts/source-serif-4-italic-400-700-latin.woff2", "assets/fonts/source-serif-4-normal-400-700-latin-ext.woff2", "assets/fonts/source-serif-4-normal-400-700-latin.woff2"
];

self.addEventListener("install", (event) => {
  // All or nothing: if any file cannot be saved, this copy is not installed and the previous one stays in use.
  event.waitUntil(Promise.all([
    caches.open(CACHE).then((cache) => cache.addAll(CORE.map((url) => new Request(url, { cache: "reload" })))),
    caches.open(FONT_CACHE).then(async (fonts) => {
      const missing = [];
      for (const url of FONTS) { if (!(await fonts.match(url))) missing.push(url); }
      return fonts.addAll(missing);
    }).catch((e) => console.warn("The Lab's fonts were not saved for offline use. The device's own fonts will be used offline.", e))
  ]).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
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

  // Fonts: the saved font first, because a font file never changes under the same name.
  if (url.pathname.includes("/assets/fonts/") && url.pathname.endsWith(".woff2")) {
    event.respondWith((async () => {
      const fonts = await caches.open(FONT_CACHE);
      const saved = await fonts.match(req);
      if (saved) return saved;
      const res = await fetch(req);
      if (res.ok) await fonts.put(req, res.clone());
      return res;
    })());
    return;
  }

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
