// public/sw.js
// Service Worker برای دریافت و نمایش نوتیف‌های Web Push (بدون Firebase).
// این فایل مستقل از هر سرویس‌ورکر دیگه‌ایه و فقط کارش گوش دادن به push و کلیک روشه.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'زیباوال', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'زیباوال';
  const options = {
    body: data.body || '',
    icon: '/APP.png',
    badge: '/APP.png',
    dir: 'rtl',
    lang: 'fa',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
