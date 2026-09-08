"use client";

import { useEffect, useState } from "react";

/**
 * Subtle offline banner — no spam toasts.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-center text-sm text-[var(--color-muted)]"
    >
      You&apos;re offline. Browsing may be limited until you reconnect.
    </div>
  );
}
