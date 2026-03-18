// Service Worker — Padron Trainer PWA
// Estrategia: Network-first con cache fallback
// Los assets estáticos se cachean; las peticiones API siempre van a red.

const CACHE_NAME = 'ado-cache-v2';

// Archivos que se cachean en la instalación (shell de la app)
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

// Instalar: cachear shell básico
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS);
        })
    );
    // Activar inmediatamente sin esperar a que se cierren pestañas
    self.skipWaiting();
});

// Activar: limpiar caches antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    // Tomar control de todas las pestañas abiertas
    self.clients.claim();
});

// Fetch: Network-first para todo, cache como fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Ignorar peticiones que no sean GET
    if (request.method !== 'GET') return;

    // Ignorar peticiones a Supabase / APIs externas (siempre online)
    const url = new URL(request.url);
    if (
        url.hostname.includes('supabase') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('generativelanguage') ||
        url.pathname.startsWith('/rest/') ||
        url.pathname.startsWith('/auth/')
    ) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                // Si la respuesta es válida, guardar copia en cache
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Sin red: servir desde cache
                return caches.match(request).then((cached) => {
                    if (cached) return cached;
                    // Si es una navegación, devolver index.html (SPA)
                    if (request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Escuchar mensajes del cliente para forzar actualización
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
