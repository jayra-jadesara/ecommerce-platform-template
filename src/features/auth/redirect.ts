/**
 * Prevent open redirects: only allow same-origin relative paths.
 */
export function safeInternalPath(
  candidate: string | null | undefined,
  fallback = "/",
): string {
  if (!candidate) return fallback;

  let path = candidate.trim();
  // Decode once to catch encoded //, @, and scheme tricks.
  try {
    path = decodeURIComponent(path);
  } catch {
    return fallback;
  }
  path = path.trim();

  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  if (path.includes("://")) return fallback;
  if (path.includes("\\")) return fallback;
  if (path.includes("@")) return fallback;
  if (/[\s\0]/.test(path)) return fallback;
  // Block backslash / control / CRLF smuggling variants
  if (/[\u0000-\u001f\u007f]/.test(path)) return fallback;

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
