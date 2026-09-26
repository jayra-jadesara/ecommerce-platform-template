import "server-only";

let wipeInProgress = false;
let wipeStartedAt = 0;

const LOCK_STALE_MS = 30 * 60 * 1000;

export function tryAcquireCleanupLock(): boolean {
  const now = Date.now();
  if (wipeInProgress && now - wipeStartedAt < LOCK_STALE_MS) {
    return false;
  }
  wipeInProgress = true;
  wipeStartedAt = now;
  return true;
}

export function releaseCleanupLock(): void {
  wipeInProgress = false;
  wipeStartedAt = 0;
}

export function isCleanupLocked(): boolean {
  if (!wipeInProgress) return false;
  if (Date.now() - wipeStartedAt >= LOCK_STALE_MS) {
    wipeInProgress = false;
    return false;
  }
  return true;
}
