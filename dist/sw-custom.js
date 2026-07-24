// Custom push notification handler for Light UP app
// This file is imported by the Workbox-generated service worker

// Handle incoming push notifications
self.addEventListener('push', function(event) {
  console.log('[SW] Push event received');
  
  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);
    
    const options = {
      body: data.body || 'New notification from Light UP',
      icon: data.icon || '/logo192.jpg',
      badge: data.badge || '/logo192.jpg',
      vibrate: [100, 50, 100],
      data: data.data || {},
      tag: data.tag || 'lightup-notification',
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Light UP', options)
    );
  } catch (e) {
    console.error('[SW] Error processing push event:', e);
    
    // Fallback: try to show notification with raw text
    try {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Light UP', {
          body: text,
          icon: '/logo192.jpg',
          badge: '/logo192.jpg'
        })
      );
    } catch (fallbackError) {
      console.error('[SW] Fallback notification also failed:', fallbackError);
    }
  }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification click received');
  
  event.notification.close();

  // Handle different actions
  if (event.action === 'dismiss') {
    console.log('[SW] User dismissed notification');
    return;
  }

  // Get the URL to open from notification data or default to root
  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  console.log('[SW] Opening URL:', fullUrl);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          // If we found a window with our origin, focus it and navigate
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('[SW] Found existing window, focusing and navigating');
            return client.navigate(fullUrl).then(() => client.focus());
          }
        }
        // If no window is open, open a new one
        console.log('[SW] Opening new window');
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

// Handle notification close (user dismisses without clicking)
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification was closed by user');
});

console.log('[SW] Custom push notification handler loaded');
