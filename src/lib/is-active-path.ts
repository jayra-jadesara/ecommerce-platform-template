/** Route match helper for storefront nav active states. */
export function isActivePath(
  pathname: string,
  href: string,
  options?: { exact?: boolean },
): boolean {
  const path = pathname || "/";
  const target = href.trim() || "/";

  if (options?.exact || target === "/") {
    return path === target;
  }

  return path === target || path.startsWith(`${target}/`);
}
