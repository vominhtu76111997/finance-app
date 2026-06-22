/* Finance Tracker — Service Worker
   Chiến lược:
   - HTML/điều hướng: NETWORK-FIRST → luôn lấy bản mới khi online, offline thì dùng cache.
   - Tài nguyên tĩnh (Chart.js CDN, Google Fonts, icon): CACHE-FIRST + cập nhật ngầm.
   - API dữ liệu (Apps Script) & API giá realtime: KHÔNG cache → luôn lấy số liệu mới.
   Đổi CACHE_VER mỗi khi muốn xoá cache cũ chắc chắn. */
const CACHE_VER = 'finance-v10';
const SHELL = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icon.svg', './icon-maskable.svg'];

// CHỈ những host này (ngoài same-origin) mới được SW xử lý/cache (thư viện tĩnh).
// Mọi thứ khác — Apps Script JSONP, Firebase realtime/auth, API giá… — SW KHÔNG đụng tới.
const CDN = /^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com)$/i;

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

  // 2) Mọi tài nguyên SAME-ORIGIN (HTML điều hướng, app.js, styles.css, icon…) → NETWORK-FIRST
  //    → online thì LUÔN nhận bản mới nhất; offline thì dùng cache. Không cần bump version thủ công.
  const accept = req.headers.get('accept') || '';
  const isNav = (req.mode === 'navigate' || accept.includes('text/html'));
  if (sameOrigin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const cp = res.clone(), cpNav = isNav ? res.clone() : null;
          caches.open(CACHE_VER).then(c => { c.put(req, cp); if (cpNav) c.put('./', cpNav); }).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || (isNav ? caches.match('./') : undefined)))
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
