const CACHE_NAME = "i-eat-vienna-v1"
const urlsToCache = [
  "/",
  "/app",
  "/app/packliste",
  "/app/nachbestellungen",
  "/app/einkaufen",
  "/offline",
  "/icon-192x192.png",
  "/icon-512x512.png",
]

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)))
})

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return (
        response ||
        fetch(event.request).catch(() => {
          // If both cache and network fail, show offline page
          if (event.request.destination === "document") {
            return caches.match("/offline")
          }
        })
      )
    }),
  )
})

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("Push event received:", event)

  let data = {}

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      console.error("Error parsing push data:", e)
      data = {
        title: "I Eat Vienna",
        message: "New notification",
        url: "/app",
        icon: "/icon-192x192.png",
      }
    }
  }

  const options = {
    body: data.message || "New notification",
    icon: data.icon || "/icon-192x192.png",
    badge: "/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/app",
      timestamp: data.timestamp || Date.now(),
    },
    actions: [
      {
        action: "open",
        title: "Open App",
      },
      {
        action: "close",
        title: "Close",
      },
    ],
    requireInteraction: true,
    tag: "nachbestellung-notification",
  }

  event.waitUntil(self.registration.showNotification(data.title || "I Eat Vienna", options))
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

// Background sync (optional - for offline functionality)
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(
      // Handle background sync tasks
      console.log("Background sync triggered"),
    )
  }
})
