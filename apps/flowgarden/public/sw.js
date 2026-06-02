/* FlowGarden service worker — installability + light offline support.
   Strategy:
   - Precache the offline fallback + core icons on install.
   - Static assets (/_next/static, /icons, /logos, /favicon, fonts): cache-first.
   - Navigations (HTML): network-first, fall back to cache, then the offline page.
   - Never cache API or auth requests — always go to network.
*/
const VERSION = 'fg-v1'
const STATIC_CACHE = `${VERSION}-static`
const PAGE_CACHE = `${VERSION}-pages`

const PRECACHE = [
  '/offline',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  '/logos/mark/flowgarden-mark-gold-1024.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons') ||
    url.pathname.startsWith('/logos') ||
    url.pathname.startsWith('/favicon') ||
    /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|css|js)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Same-origin only; never intercept API / auth / supabase / map tiles.
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return

  // HTML navigations → network-first with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline'))
        )
    )
    return
  }

  // Static assets → cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone()
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy))
            return res
          })
      )
    )
  }
})

// Allow the page to trigger an immediate update.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})
