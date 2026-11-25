/* Offline-app: eerst het netwerk (zodat je de nieuwste versie krijgt), anders de bewaarde kopie.
   De cachenaam begint met "ufc-beheer-": de trainersapp en gymles-app op hetzelfde domein
   ruimen alleen caches op die met "floorball-" beginnen. */
const CACHE = "ufc-beheer-v3";
const CORE = ["./", "index.html", "manifest.webmanifest", "filmen/", "shared/config.js", "shared/auth.js", "shared/style.css",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/ufc-logo.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("ufc-beheer-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;   // Supabase en filmpjes altijd live
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit || caches.match("index.html"))));
});
