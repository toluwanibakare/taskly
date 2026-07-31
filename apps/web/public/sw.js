// Tezra Service Worker for handling PWA Web Push Notifications
self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Tezra Update';
    const options = {
      body: payload.body || 'You have a new update on Tezra.',
      icon: payload.icon || '/logo.png',
      badge: payload.badge || '/logo.png',
      data: {
        url: payload.url || '/'
      },
      vibrate: [100, 50, 100],
      tag: payload.tag || 'tezra-notification'
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Error rendering push event payload:', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If a browser window is already open, navigate it to the target page and focus
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(location.origin) && 'focus' in client) {
          return client.navigate(targetUrl).then(c => c.focus());
        }
      }
      // Otherwise, open a new standalone app window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
