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
