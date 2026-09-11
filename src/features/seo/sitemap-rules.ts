/** Pure helpers for tests and robots — no database access. */

export function buildRobotsDisallowPaths(adminSegment: string): string[] {
  const admin = adminSegment.replace(/^\/+|\/+$/g, "");
  return [
    `/${admin}/`,
    "/account",
    "/cart",
    "/checkout",
    "/payment",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth",
  ];
}

export function shouldIncludeInSitemap(input: {
  kind: "product" | "category" | "page" | "utility" | "blog";
  status?: string;
  isActive?: boolean;
}): boolean {
  switch (input.kind) {
    case "product":
      return input.status === "active";
    case "category":
      return input.isActive === true;
    case "page":
    case "blog":
      return input.status === "published";
    case "utility":
      return false;
    default:
      return false;
  }
}
