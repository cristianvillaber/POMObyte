self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('pomobyte-v1').then(cache => {
      return cache.addAll([
        '/POMObyte/',
        '/POMObyte/index.html',
        '/POMObyte/style.css',
        '/POMObyte/app.js',
        '/POMObyte/assets/btn-start.png',
        '/POMObyte/assets/btn-start-pressed.png',
        '/POMObyte/assets/btn-pause.png',
        '/POMObyte/assets/btn-reset.png',
        '/POMObyte/assets/btn-reset-pressed.png',
        '/POMObyte/assets/favicon.png'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});