/* =====================================================================
   LAS LETRAS VIVAS — Service Worker (PWA)
   Cachea la "app shell" para que funcione SIN INTERNET en la tablet.
   Estrategia: cache-first con respaldo de red (es un sitio estático).
   Sube CACHE cuando cambies archivos para forzar la actualización.
   ===================================================================== */
var CACHE = "letras-vivas-v2";
var ASSETS = [
  "./",
  "index.html",
  "style.css",
  "data.js",
  "core.js",
  "bloques.js",
  "modos.js",
  "diccionario.js",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then(function (cacheado) {
      if (cacheado) return cacheado;
      return fetch(req).then(function (resp) {
        // guarda una copia para la próxima vez (solo respuestas del propio origen)
        if (resp && resp.ok && req.url.indexOf(self.location.origin) === 0) {
          var copia = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return resp;
      }).catch(function () {
        // si falla la red y es una navegación, devolvemos la página principal
        if (req.mode === "navigate") return caches.match("index.html");
      });
    })
  );
});
