// Service worker di Tassello: conserva una copia del programma per usarlo come app anche senza rete.
// Con la rete prende sempre la versione pubblicata sul sito e aggiorna la copia; senza rete usa l'ultima copia.
const CACHE = 'tassello-ufficio';
const FILES = ['tassello-ufficio.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
const urlOf = name => new URL(name, self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(FILES.map(name => new Request(urlOf(name), {cache: 'reload'}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.search = '';
  if (!FILES.some(name => urlOf(name) === url.href)) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(url.href, copy)));
    }
    return response;
  }).catch(() => caches.match(url.href)));
});
