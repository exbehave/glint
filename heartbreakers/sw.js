/* BGC: Heartbreakers — service worker (Nov 9, 2026). Only job: show the admin's alerts (a friend shot the moon or
   pulled a Queen's Gambit) and open that game's replay when one is tapped. No caching, no fetch handler. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Heartbreakers', {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || undefined,
    data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      // the game is already open: ask it to play the replay where it is (no reload, the game in progress stays put)
      if (/\/heartbreakers\/(index\.html)?(\?|#|$)/.test(c.url) && 'focus' in c) { c.postMessage({ replay: url }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
