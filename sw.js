/* Finance Tracker — Service Worker
   Chiến lược:
   - HTML/điều hướng: NETWORK-FIRST → luôn lấy bản mới khi online, offline thì dùng cache.
   - Tài nguyên tĩnh (Chart.js CDN, Google Fonts, icon): CACHE-FIRST + cập nhật ngầm.
   - API dữ liệu (Apps Script) & API giá realtime: KHÔNG cache → luôn lấy số liệu mới.
   Đổi CACHE_VER mỗi khi muốn xoá cache cũ chắc chắn. */
const CACHE_VER = 'finance-v2';
const SHELL = ['./', './manifest.json', './icon.svg', './icon-maskable.svg'];

// CHỈ những host này (ngoài same-origin) mới được SW xử lý/cache.
// Mọi thứ khác — Apps Script (JSONP), API giá… — SW KHÔNG đụng tới (để trình duyệt tự lo).
const CDN = /^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/i;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VER)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  const sameOrigin = (url.origin === self.location.origin);
  // Chỉ can thiệp same-origin + vài CDN tĩnh đã biết. Còn lại (Apps Script JSONP,
  // API giá, mọi domain khác) → return: SW không đụng, tránh phá kết nối trên iOS.
  if (!sameOrigin && !CDN.test(url.hostname)) return;

  // 2) HTML / điều hướng (same-origin) → network-first
  const accept = req.headers.get('accept') || '';
  if (sameOrigin && (req.mode === 'navigate' || accept.includes('text/html'))) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const cp = res.clone();
          caches.open(CACHE_VER).then(c => c.put('./', cp)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./').then(r => r || caches.match(req)))
    );
    return;
  }

  // 3) Tài nguyên tĩnh → cache-first, cập nhật ngầm
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const cp = res.clone();
          caches.open(CACHE_VER).then(c => c.put(req, cp)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
