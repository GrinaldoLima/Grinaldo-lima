// Service worker do Lima Gestão Financeira.
// Sempre busca a versão mais nova na internet; a cópia guardada só é usada
// para abrir a tela quando o celular está sem conexão.
// Os dados (Firebase) e a pasta /api nunca passam por aqui.
const CACHE = 'limafin-v1';
const BASICO = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(req)
      .then(resp => {
        if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return resp;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('/')))
  );
});
