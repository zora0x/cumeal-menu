const CACHE_NAME = "cumeal-shell-v25";
const SHELL = ["./", "./index.html", "./styles.css", "./app.js?v=25", "./october-menu.js?v=21", "./november-menu.js?v=22", "./november-international-menu.js?v=25", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  if (new URL(event.request.url).origin !== self.location.origin) return;
  const request = new Request(event.request, { cache: "no-store" });
  event.respondWith(
    fetch(request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
