"use client";

import { useSyncExternalStore } from "react";

/** Stable empty subscribe — hydration flips once; no external store events. */
function subscribeHydration() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/** True only after hydration — keeps SSR markup identical to the first client paint. */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
}
