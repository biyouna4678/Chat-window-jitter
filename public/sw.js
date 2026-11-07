// ==========================================
// 开发测试专用 Service Worker
// 作用：仅仅为了让 PWA 生效，绝对不缓存你的代码
// 以确保你每次打开都能看到 GitHub 上最新的修改
// ==========================================

self.addEventListener('install', (event) => {
  // 强制让新的 Service Worker 立即接管，跳过等待
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 激活时，清空所有可能存在的旧版本缓存，防止历史遗留问题
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('清理旧缓存:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // 立即控制当前打开的所有页面
      self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // 只要不是 GET 请求就不管
  if (event.request.method !== 'GET') return;

  // 对于所有请求，直接去网络拿最新的，完全不拦截！
  // 这样你在 GitHub 上改了代码，手机上刷新一下就能看到
});
