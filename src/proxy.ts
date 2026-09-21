import { NextResponse, type NextRequest } from "next/server";
import { getAdminRouteSegment } from "@/config/admin-route";
import { updateSession } from "@/lib/supabase/middleware";
import { safeInternalPath } from "@/features/auth/redirect";

function withAdminPathname(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-pathname", pathname);
  const next = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.cookies.getAll().forEach((cookie) => {
    next.cookies.set(cookie);
  });
  return next;
}

/**
 * Next.js 16 proxy (formerly middleware): session refresh + coarse redirects.
 * Fine-grained RBAC remains in server layouts via requireAdmin / requirePermission.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const gated = withAdminPathname(request, response, pathname);

  let adminSegment: string;
  try {
    adminSegment = getAdminRouteSegment();
  } catch {
    return gated;
  }

  const adminBase = `/${adminSegment}`;
  const isAdminArea =
    pathname === adminBase || pathname.startsWith(`${adminBase}/`);
  const isAdminLogin =
    pathname === `${adminBase}/login` ||
    pathname.startsWith(`${adminBase}/login/`);
  const isAccountArea =
    pathname === "/account" || pathname.startsWith("/account/");

  if (isAccountArea && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set(
      "next",
      safeInternalPath(`${pathname}${request.nextUrl.search}`, "/account"),
    );
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminArea && !isAdminLogin && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `${adminBase}/login`;
    const requested = `${pathname}${request.nextUrl.search}`;
    const nextTarget =
      pathname === `${adminBase}/login` ||
      pathname.startsWith(`${adminBase}/login/`)
        ? `${adminBase}/dashboard`
        : safeInternalPath(requested, `${adminBase}/dashboard`);
    loginUrl.searchParams.set("next", nextTarget);
    return NextResponse.redirect(loginUrl);
  }

  return gated;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
