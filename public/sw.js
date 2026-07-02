// Service Worker — Polla Mundialera 2026
//
// Los datos (fixture, tabla, pronósticos) cambian todo el tiempo durante el
// Mundial, así que las páginas HTML NUNCA se cachean: si alguna vez se cachea
// una respuesta vieja (por un corte de red puntual), queda pegada mostrando
// datos desactualizados hasta que alguien note el problema. Solo se cachean
// assets verdaderamente estáticos (íconos, manifest) para dar algo de
// capacidad offline sin arriesgar contenido obsoleto.
const CACHE_NAME = "polla-v2";
const STATIC_ASSETS = ["/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nunca cachear: API, y cualquier navegación de página (documentos HTML).
  // Siempre red directa, sin fallback a caché — mejor un error visible que
  // datos viejos silenciosos.
  if (url.pathname.startsWith("/api/") || request.mode === "navigate") return;

  // Solo íconos/manifest/assets estáticos: cache-first con red de respaldo.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok && request.method === "GET") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
    )
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Polla Mundialera", body: event.data.text(), url: "/fixture" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Polla Mundialera 2026", {
      body: data.body ?? "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: { url: data.url ?? "/fixture" },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/fixture";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find((c) => c.url.includes(self.location.origin));
        if (existingClient) {
          existingClient.focus();
          existingClient.navigate(url);
        } else {
          self.clients.openWindow(url);
        }
      })
  );
});
