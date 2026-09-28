/**
 * sw.js — offline support for the handbook.
 *
 * Strategy: network-first with a cache fallback. Online you always see the newest
 * notes the instant you edit them; offline the whole handbook is served from the
 * cache you built on the last visit. Every successful GET is cached, so the
 * handbook keeps working on a plane, a train, or a flaky hotel Wi-Fi.
 */

const VERSION = 'cu-reader-v2';

/* This file must sit at the site root: a service worker can only cache requests
   inside its own scope, and the notes live in Assets/ and notes.json. */
const ROOT = new URL('./', self.location).href;

const SHELL = [
  'index.html',
  'reader/app.css',
  'reader/app.js',
  'reader/md.js',
  'reader/icon.svg',
  'reader/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await Promise.all(
        SHELL.map(async (path) => {
          try {
            await cache.add(new Request(new URL(path, ROOT), { cache: 'reload' }));
          } catch {
            /* A missing optional file must not break the install. */
          }
        }),
      );

      // Pre-cache every note file listed in the manifest.
      try {
        const res = await fetch(new URL('notes.json', ROOT), { cache: 'reload' });
        if (res.ok) {
          await cache.put(new URL('notes.json', ROOT), res.clone());
          const manifest = await res.json();
          await Promise.all(
            (manifest.files || []).map(async (entry) => {
              const name = typeof entry === 'string' ? entry : entry.file;
              try {
                const fileRes = await fetch(new URL(name, ROOT), { cache: 'reload' });
                if (fileRes.ok) await cache.put(new URL(name, ROOT), fileRes);
              } catch {
                /* ignore individual failures */
              }
            }),
          );
        }
      } catch {
        /* offline at install time — the cache fills up during normal browsing */
      }

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/__live')) return; // dev-server event stream

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;

        if (request.mode === 'navigate') {
          const shell =
            (await cache.match(new URL('index.html', ROOT))) ||
            (await cache.match(request));
          if (shell) return shell;
        }
        return new Response(
          'Offline — this page has not been cached yet.',
          { status: 503, headers: { 'Content-Type': 'text/plain' } },
        );
      }
    })(),
  );
});
