/// <reference lib="webworker" />

const CACHE_NAME = 'chronostory-v1'

// 靜態資源快取（安裝時預快取）
const PRECACHE_URLS = [
  '/',
]

// 安裝：預快取核心資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// 啟動：清理舊版快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

// 攔截請求：靜態資源 cache-first，API 走網路
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API 請求、非 GET 請求 → 直接走網路
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return
  }

  // CDN 圖片 → cache-first（圖片不常變）
  if (url.hostname === 'cdn.chronostorysearch.com') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // 導航請求（HTML 頁面）→ network-first
  // 確保用戶拿到最新 HTML → 載入最新 JS bundle → 最新 available-images manifest
  // Next.js JS/CSS 用 hash 檔名不受影響，但 HTML URL 不變（/），必須 network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request)) // 離線時回退到快取
    )
    return
  }

  // 同源靜態資源（JS/CSS/字體）→ stale-while-revalidate
  // Next.js 靜態資源使用 content hash 檔名，新部署 = 新 URL，不受 stale 影響
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetching = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        return cached || fetching
      })
    )
  }
})
