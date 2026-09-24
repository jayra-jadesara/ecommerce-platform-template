import { NextResponse, type NextRequest } from "next/server";
import { getAdminRouteSegment } from "@/config/admin-route";
import { STAFF_VIEW_HEADER } from "@/features/auth/staff-view-constants";
import { updateSession } from "@/lib/supabase/middleware";
import { safeInternalPath } from "@/features/auth/redirect";

function copySessionCookies(
  from: NextResponse,
  to: NextResponse,
): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

function withAdminHeaders(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
  staffViewToken?: string | null,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-pathname", pathname);
  if (staffViewToken) {
    requestHeaders.set(STAFF_VIEW_HEADER, staffViewToken);
  } else {
    requestHeaders.delete(STAFF_VIEW_HEADER);
  }
  const next = NextResponse.next({
    request: { headers: requestHeaders },
  });
  return copySessionCookies(sessionResponse, next);
}

/**
 * Next.js 16 proxy (formerly middleware): session refresh + coarse redirects.
 * Fine-grained RBAC remains in server layouts via requireAdmin / requirePermission.
 *
 * Staff view uses URL `/[admin]/as/[token]/…` (tab-isolated). We rewrite to the
 * normal admin path and pass the token via request header for getCurrentAdmin.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  let adminSegment: string;
  try {
    adminSegment = getAdminRouteSegment();
  } catch {
    return withAdminHeaders(request, response, pathname);
  }

  const adminBase = `/${adminSegment}`;
  const staffViewMatch = pathname.match(
    new RegExp(`^${adminBase}/as/([^/]+)(/.*)?$`),
  );

  let effectivePath = pathname;
  let staffViewToken: string | null = null;
  let rewritePath: string | null = null;

  if (staffViewMatch) {
    staffViewToken = decodeURIComponent(staffViewMatch[1] ?? "");
    const rest = staffViewMatch[2] || "";
    rewritePath = rest && rest !== "/" ? `${adminBase}${rest}` : adminBase;
    effectivePath = rewritePath;
  }

  const isAdminArea =
    effectivePath === adminBase || effectivePath.startsWith(`${adminBase}/`);
  const isAdminLogin =
    effectivePath === `${adminBase}/login` ||
    effectivePath.startsWith(`${adminBase}/login/`);
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
    const requested = `${effectivePath}${request.nextUrl.search}`;
    const nextTarget =
      effectivePath === `${adminBase}/login` ||
      effectivePath.startsWith(`${adminBase}/login/`)
        ? `${adminBase}/dashboard`
        : safeInternalPath(requested, `${adminBase}/dashboard`);
    loginUrl.searchParams.set("next", nextTarget);
    return NextResponse.redirect(loginUrl);
  }

  if (rewritePath && staffViewToken) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = rewritePath;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-admin-pathname", rewritePath);
    requestHeaders.set(STAFF_VIEW_HEADER, staffViewToken);
    const rewritten = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
    return copySessionCookies(response, rewritten);
  }

  return withAdminHeaders(request, response, effectivePath, staffViewToken);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
