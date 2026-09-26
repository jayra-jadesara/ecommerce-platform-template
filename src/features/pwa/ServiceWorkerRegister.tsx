"use client";

import { useEffect } from "react";

const SW_QUERY_VERSION = "3";
const DEV_SW_PURGE_FLAG = "sf-sw-dev-purged";

/**
 * Registers the minimal storefront service worker.
 * Failures are silent — the site must work without a SW.
 * In development, actively unregister SWs so stale caches cannot serve
 * old Turbopack / Next chunks (causes "Failed to fetch" / "(stale)" overlay).
 */
export function ServiceWorkerRegister({
  adminSegment = "manage-store",
}: {
  adminSegment?: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isDev = process.env.NODE_ENV === "development";
    const allowDevSw = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === "1";

    if (isDev && !allowDevSw) {
      void (async () => {
        const hadController = Boolean(navigator.serviceWorker.controller);
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }

        // One forced reload when an old SW was controlling this tab —
        // otherwise the page keeps the stale Next 15 client in memory.
        if (hadController || regs.length > 0) {
          try {
            if (!sessionStorage.getItem(DEV_SW_PURGE_FLAG)) {
              sessionStorage.setItem(DEV_SW_PURGE_FLAG, "1");
              window.location.reload();
            }
          } catch {
            /* private mode — skip reload flag */
          }
        }
      })();
      return;
    }

    const segment = encodeURIComponent(adminSegment.replace(/^\/+|\/+$/g, ""));
    const src = `/sw.js?admin=${segment}&v=${SW_QUERY_VERSION}`;

    void navigator.serviceWorker
      .register(src)
      .then((reg) => {
        // Pull updates quickly after deploys so old Flight clients die.
        void reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      })
      .catch(() => {
        // Non-fatal
      });
  }, [adminSegment]);

  return null;
}
