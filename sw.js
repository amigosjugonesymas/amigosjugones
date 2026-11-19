/**
 * ============================================================================
 * AMIGOS JUGONES — SERVICE WORKER DE ALTO RENDIMIENTO (SW.JS v1.0)
 * ============================================================================
 * Estrategias de Aceleración Móvil:
 * 1. Cache-First: Fuentes, imágenes AMOLED, librerías CDN y efectos de audio.
 * 2. Stale-While-Revalidate: Hojas de estilo CSS y scripts de cliente.
 * 3. Network-First: Páginas HTML principales con fallback offline AMOLED.
 * 4. Network-Only (Zero-Cache): Endpoints del Orquestador (Apps Script) para
 *    evitar falsos positivos en autenticación o validación de puntos.
 * ============================================================================
 */

const CACHE_VERSION = 'aj-cache-v1.0';
const OFFLINE_URL = 'offline.html';

// App Shell esencial para arranque instantáneo (< 200ms)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './criptico.html',
  './trivia.html',
  './juegos.html',
  './css/style.css?v=15.4',
  './css/skins.css?v=1.7',
  './js/components.js?v=11.8',
  './js/auth.js?v=1.2',
  './js/logro-card.js?v=1.0',
  './js/popup-diario.js?v=1.0',
  './js/skin-engine.js?v=1.8',
  './manifest.json',
  './imagenes/LOGO AMIGOS JUGONES.png',
  './imagenes/escudo.png'
];

// Respuesta AMOLED predeterminada cuando no hay conexión ni caché para una página
const OFFLINE_HTML_RESPONSE = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigos Jugones — Sin Conexión</title>
  <style>
    body {
      margin: 0;
      background: #080814;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: rgba(18, 14, 38, 0.9);
      border: 1px solid rgba(124, 58, 237, 0.4);
      border-radius: 20px;
      padding: 30px 20px;
      max-width: 380px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.8);
    }
    .icon { font-size: 3.5rem; margin-bottom: 12px; }
    h1 { font-size: 1.4rem; margin: 0 0 10px; color: #fff; }
    p { font-size: 0.9rem; color: #94a3b8; line-height: 1.5; margin: 0 0 20px; }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #fff;
      padding: 12px 24px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.9rem;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎲📡</div>
    <h1>¡Estás Fuera de Línea!</h1>
    <p>Amigos Jugones requiere conexión a internet para validar el oráculo del Críptico, la Trivia Geek y sincronizar tus puntos en la comunidad.</p>
    <button class="btn" onclick="window.location.reload()">🔄 Reintentar Conexión</button>
  </div>
</body>
</html>`;

/**
 * ── 1. INSTALACIÓN (Precaching del App Shell) ──────────────────────────────
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // Usar allSettled para no abortar si un recurso individual falla
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] Precache omitido:', url, err))
        )
      );
    })
  );
});

/**
 * ── 2. ACTIVACIÓN (Limpieza de versiones antiguas) ─────────────────────────
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            console.log('[SW] Purgando caché obsoleta:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * ── 3. INTERCEPTACIÓN DE PETICIONES (Estrategias Combinadas) ───────────────
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo interceptar peticiones GET
  if (req.method !== 'GET') return;

  // 1. REGLA CRÍTICA: Google Apps Script y APIs del Orquestador son NETWORK-ONLY
  // Jamás cachear respuestas de validación de puntos, tokens ni respuestas de juegos
  if (url.hostname.includes('script.google.com') || url.pathname.includes('/api/')) {
    return; // Pasa directo a la red sin tocar la caché del Service Worker
  }

  // 2. REGLA ESTÁTICA (Cache-First): Imágenes, Fuentes y CDN externo
  const isStaticMedia =
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    req.destination === 'image' ||
    req.destination === 'font' ||
    req.destination === 'audio' ||
    /\.(png|jpg|jpeg|svg|webp|ico|mp3|wav|ogg)$/i.test(url.pathname);

  if (isStaticMedia) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const resClone = networkRes.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
            }
            return networkRes;
          })
          .catch(() => {
            // Si es imagen y no hay red, podríamos entregar un placeholder o undefined
            return cached;
          });
      })
    );
    return;
  }

  // 3. REGLA DE NAVEGACIÓN (Páginas HTML): Network-First con fallback a Caché y Pantalla Offline
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;

          // Si ni la red ni la caché tienen la página, entregar pantalla AMOLED amigable
          return new Response(OFFLINE_HTML_RESPONSE, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 4. REGLA DE RECURSOS PROPIOS (CSS / JS): Stale-While-Revalidate
  // Devuelve la copia local de inmediato para máxima velocidad y actualiza en background
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

