// ==========================================
// 极简 Service Worker（严格按照 iOS PWA 实战方案）
// 作用：激活 PWA 特性，绝对不拦截缓存，确保手机每次刷新获取最新代码
// ==========================================

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
// fetch 留空，让所有网络请求走默认

