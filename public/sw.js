/**
 * Minimal service worker for storefront PWA.
 * - Precaches offline fallback
 * - Cache-first for /_next/static
 * - Network-only for private/admin/payment/API
 * - HTML navigations: network-first, offline page on failure
 *
 * This file is served from /public and must stay dependency-free.
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `storefront-static-${CACHE_VERSION}`;
const OFFLINE_CACHE = `storefront-offline-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRIVATE_PREFIXES = [
  "/account",
  "/cart",
  "/checkout",
  "/payment",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/api/",
];

function adminSegment() {
  // Injected at register time via query string; default manage-store
  try {
    const url = new URL(self.location.href);
    return (url.searchParams.get("admin") || "manage-store").replace(
      /^\/+|\/+$/g,
      "",
    );
  } catch {
    return "manage-store";
  }
}

function isPrivate(pathname) {
  const admin = `/${adminSegment()}`;
  if (pathname === admin || pathname.startsWith(`${admin}/`)) return true;
  return PRIVATE_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) return pathname.startsWith(prefix);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      try {
        await cache.add(OFFLINE_URL);
      } catch {
        // Offline page may be unavailable during first install in some hosts.
      }
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              (key.startsWith("storefront-static-") ||
                key.startsWith("storefront-offline-")) &&
              key !== STATIC_CACHE &&
              key !== OFFLINE_CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Same-origin only
  if (url.origin !== self.location.origin) return;

  const { pathname } = url;

  if (isPrivate(pathname)) {
    // Network only — never put private responses in Cache Storage
    event.respondWith(fetch(request));
    return;
  }

  // Next.js build assets: cache-first
  if (pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // Navigations: network-first, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(OFFLINE_CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ||
            new Response("You are offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
  }
});
