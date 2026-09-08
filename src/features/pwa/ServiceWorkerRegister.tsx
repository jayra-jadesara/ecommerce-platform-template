"use client";

import { useEffect } from "react";

/**
 * Registers the minimal storefront service worker.
 * Failures are silent — the site must work without a SW.
 */
export function ServiceWorkerRegister({
  adminSegment = "manage-store",
}: {
  adminSegment?: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Avoid SW during Next.js local HMR quirks unless explicitly enabled
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_ENABLE_SW_DEV !== "1"
    ) {
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
