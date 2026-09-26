/**
 * Minimal service worker for storefront PWA.
 * - Precaches offline fallback
 * - Cache-first for immutable /_next/static hashed assets only
 * - Never intercepts App Router RSC / Flight / HMR (avoids stale client → Failed to fetch)
 * - Network-only for private/admin/payment/API
 * - HTML navigations: network-first, offline page on failure
 *
 * This file is served from /public and must stay dependency-free.
 */

const CACHE_VERSION = "v3";
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

/**
 * App Router soft-nav / prefetch / HMR must hit the network unbuffered.
 * Intercepting these (or serving a stale cached shell) causes:
 *   TypeError: Failed to fetch → fetchMissingDynamicData
 * and the error overlay shows an old Next version as "(stale)".
 */
function isNextRuntimeRequest(request, url) {
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/x-component")) return true;
  if (request.headers.get("rsc") === "1") return true;
  if (request.headers.get("next-router-state-tree")) return true;
  if (request.headers.get("next-router-prefetch")) return true;
  if (request.headers.get("next-url")) return true;
  if (url.searchParams.has("_rsc")) return true;

  const { pathname } = url;
  if (pathname.startsWith("/_next/webpack-hmr")) return true;
  if (pathname.startsWith("/_next/data/")) return true;
  if (pathname.startsWith("/_next/image")) return true;
  // Turbopack / dev flight helpers — never cache or wrap
  if (pathname.startsWith("/_next/static/chunks/") && pathname.includes("turbopack")) {
    return true;
  }
  return false;
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
          .filter((key) => {
            const ours =
              key.startsWith("storefront-static-") ||
              key.startsWith("storefront-offline-");
            if (!ours) return false;
            return key !== STATIC_CACHE && key !== OFFLINE_CACHE;
          })
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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

  // Critical: do not intercept RSC / Flight / HMR — let the browser talk to Next.
  if (isNextRuntimeRequest(request, url)) return;

  const { pathname } = url;

  if (isPrivate(pathname)) {
    // Network only — never put private responses in Cache Storage
    // Pass through without respondWith so redirects/cookies stay intact.
    return;
  }

  // Immutable hashed build assets only (production). Cache-first is safe
  // because filenames change per deploy; v3+ also evicts older version caches.
  if (pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) {
          // Background revalidate — drop stale hashed shells after upgrades
          void fetch(request)
            .then((response) => {
              if (response.ok) return cache.put(request, response.clone());
            })
            .catch(() => {});
          return cached;
        }
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // Navigations: network-first, offline fallback — do not cache HTML
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
