import { NextResponse } from "next/server"

export async function GET() {
  // Service worker code
  const serviceWorkerContent = `
// Service Worker for PetPulse PWA
const CACHE_NAME = "petpulse-v2" 
const urlsToCache = ["/", "/install", "/icon-192x192.png", "/icon-512x512.png", "/manifest.json", "/globals.css"]

// Log when the service worker is first evaluated
console.log("[Service Worker] Script evaluated")

// Install event - cache assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install")
  self.skipWaiting() // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell")
      return cache.addAll(urlsToCache)
    }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activate")
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key)
            return caches.delete(key)
          }
        }),
      )
    }),
  )
  return self.clients.claim() // Take control immediately
})

// Fetch event - serve from cache if available
self.addEventListener("fetch", (event) => {
  // Log fewer fetch events to avoid console spam
  if (!event.request.url.includes("chrome-extension")) {
    console.log('[Service Worker] Fetch', event.request.url)
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response
      }
      return fetch(event.request)
    }),
  )
})

// Push event - handle push notifications
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push received")
  const title = "PetPulse"
  const options = {
    body: event.data ? event.data.text() : "New notification",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
  }

  event.waitUntil(self.registration.showNotification(title, options))
})
`

  // Return the service worker content with the correct MIME type
  return new NextResponse(serviceWorkerContent, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}
