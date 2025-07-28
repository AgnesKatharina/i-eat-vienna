const CACHE_NAME = "i-eat-vienna-v1"
const urlsToCache = ["/", "/app", "/app/packliste", "/app/nachbestellungen", "/offline", "/manifest.json"]

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)))
})

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.destination === "document") {
          return caches.match("/offline")
        }
      }),
  )
})

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("Push event received:", event)

  let notificationData = {
    title: "I Eat Vienna",
    message: "Sie haben eine neue Benachrichtigung",
    url: "/app",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
  }

  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() }
    } catch (error) {
      console.error("Error parsing push data:", error)
    }
  }

  const notificationOptions = {
    body: notificationData.message,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: {
      url: notificationData.url,
      timestamp: notificationData.timestamp || Date.now(),
    },
    actions: [
      {
        action: "open",
        title: "Öffnen",
      },
      {
        action: "close",
        title: "Schließen",
      },
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(notificationData.title, notificationOptions))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event)

  event.notification.close()

  if (event.action === "close") {
    return
  }

  const urlToOpen = event.notification.data?.url || "/app"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus()
        }
      }

      // If no existing window/tab, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    }),
  )
})

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(
      // Handle background sync logic here
      console.log("Background sync triggered"),
    )
  }
})
