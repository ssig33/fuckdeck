// Network first for this app's own files, so a deploy is picked up on the
// next load; the cached copy is used only when offline. Requests to
// Mastodon / Misskey servers are not touched.
const CACHE = "fuckdeck-v1";
const APP_SHELL = ["./", "./index.js", "./index.css", "./manifest.webmanifest", "./favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const isNavigation = request.mode === "navigate";
        const cached =
          (await caches.match(request, { ignoreSearch: isNavigation })) ??
          (isNavigation ? await caches.match("./") : undefined);
        return cached ?? Response.error();
      })
  );
});
