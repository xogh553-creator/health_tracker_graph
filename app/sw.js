// 오프라인에서도 앱이 열리도록 앱 파일을 기기에 보관하는 서비스 워커
const CACHE = 'blood-log-v1';
const APP_FILES = [
    './',
    'tailwind.css',
    'app.css',
    'i18n.js',
    'app.js',
    'vendor/chart.umd.min.js',
    'vendor/chartjs-plugin-annotation.min.js',
    'manifest.webmanifest',
    'manifest.en.webmanifest',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/maskable-512.png',
    'icons/apple-touch-icon.png'
];
const NETWORK_WAIT_MS = 3000;

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

// 온라인이면 최신 파일을 받아 보여주고 보관본도 갈아둔다.
// 오프라인이거나 응답이 3초 넘게 늦으면 기기에 보관된 파일로 연다.
self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
    const isPage = request.mode === 'navigate';
    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(isPage ? './' : request);
        const fresh = fetch(request).then(response => {
            if (response.ok) cache.put(isPage ? './' : request, response.clone());
            return response;
        });
        if (!cached) return fresh;
        const late = new Promise(resolve => setTimeout(() => resolve(cached), NETWORK_WAIT_MS));
        return Promise.race([fresh.catch(() => cached), late]);
    })());
});
