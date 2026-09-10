"use client";

import { useEffect } from "react";

/**
 * Registers the minimal storefront service worker.
 * Failures are silent — the site must work without a SW.
 * In development, actively unregister SWs so stale caches cannot serve
 * old Turbopack chunks (causes "module factory is not available").
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
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
          void reg.unregister();
        }
      });
      if ("caches" in window) {
        void caches.keys().then((keys) => {
          for (const key of keys) {
            void caches.delete(key);
          }
        });
      }
      return;
    }

    const segment = encodeURIComponent(adminSegment.replace(/^\/+|\/+$/g, ""));
    const src = `/sw.js?admin=${segment}&v=1`;

    void navigator.serviceWorker.register(src).catch(() => {
      // Non-fatal
    });
  }, [adminSegment]);

  return null;
}
