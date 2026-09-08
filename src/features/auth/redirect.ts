/**
 * Prevent open redirects: only allow same-origin relative paths.
 */
export function safeInternalPath(
  candidate: string | null | undefined,
  fallback = "/",
): string {
  if (!candidate) return fallback;

  const path = candidate.trim();
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  if (path.includes("://")) return fallback;
  if (path.includes("\\")) return fallback;
  if (/[\s]/.test(path)) return fallback;

  return path;
}

/**
 * Admin post-login destination. Rejects the login URL itself so we never
 * bounce back to /login after a successful sign-in.
 */
export function safeAdminNextPath(
  candidate: string | null | undefined,
  adminBase: string,
  fallback: string,
): string {
  const next = safeInternalPath(candidate, fallback);
  const loginPath = `${adminBase.replace(/\/$/, "")}/login`;
  if (next === loginPath || next.startsWith(`${loginPath}?`)) {
    return fallback;
  }
  return next;
}
