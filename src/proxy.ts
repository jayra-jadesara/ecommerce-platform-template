import { NextResponse, type NextRequest } from "next/server";
import { getAdminRouteSegment } from "@/config/admin-route";
import {
  AUTH_LAST_SIGN_IN_HEADER,
  AUTH_USER_EMAIL_HEADER,
  AUTH_USER_ID_HEADER,
  SESSION_STARTED_COOKIE,
  SESSION_STARTED_COOKIE_MAX_AGE_SEC,
} from "@/features/auth/proxy-auth-headers";
import { STAFF_VIEW_HEADER } from "@/features/auth/staff-view-constants";
import { updateSession } from "@/lib/supabase/middleware";
import { safeInternalPath } from "@/features/auth/redirect";
import type { User } from "@supabase/supabase-js";

function copySessionCookies(
  from: NextResponse,
  to: NextResponse,
): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

/** Start the login-duration clock when missing (proxy can set cookies). */
function ensureSessionStartedCookie(
  request: NextRequest,
  response: NextResponse,
  user: User | null,
): void {
  if (!user) return;
  if (request.cookies.get(SESSION_STARTED_COOKIE)?.value) return;
  const nowSec = Math.floor(Date.now() / 1000);
  response.cookies.set(SESSION_STARTED_COOKIE, String(nowSec), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_STARTED_COOKIE_MAX_AGE_SEC,
  });
}

/**
 * Forward proxy-validated auth identity into the RSC request so session.ts
 * can skip a second auth.getUser() on the same HTTP request.
 * Always strip client-supplied copies first.
 */
function applyTrustedAuthHeaders(
  requestHeaders: Headers,
  user: User | null,
): void {
  requestHeaders.delete(AUTH_USER_ID_HEADER);
  requestHeaders.delete(AUTH_USER_EMAIL_HEADER);
  requestHeaders.delete(AUTH_LAST_SIGN_IN_HEADER);
  if (!user) return;
  requestHeaders.set(AUTH_USER_ID_HEADER, user.id);
  if (user.email) {
    requestHeaders.set(AUTH_USER_EMAIL_HEADER, user.email);
  }
  if (user.last_sign_in_at) {
    requestHeaders.set(AUTH_LAST_SIGN_IN_HEADER, user.last_sign_in_at);
  }
}

function withAdminHeaders(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
  user: User | null,
  staffViewToken?: string | null,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-pathname", pathname);
  applyTrustedAuthHeaders(requestHeaders, user);
  if (staffViewToken) {
    requestHeaders.set(STAFF_VIEW_HEADER, staffViewToken);
  } else {
    requestHeaders.delete(STAFF_VIEW_HEADER);
  }
  const next = NextResponse.next({
    request: { headers: requestHeaders },
  });
  copySessionCookies(sessionResponse, next);
  ensureSessionStartedCookie(request, next, user);
  return next;
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
    return withAdminHeaders(request, response, pathname, user);
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
    applyTrustedAuthHeaders(requestHeaders, user);
    const rewritten = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
    copySessionCookies(response, rewritten);
    ensureSessionStartedCookie(request, rewritten, user);
    return rewritten;
  }

  return withAdminHeaders(
    request,
    response,
    effectivePath,
    user,
    staffViewToken,
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
