import { NextResponse, type NextRequest } from "next/server";
import { getAdminRouteSegment } from "@/config/admin-route";
import { updateSession } from "@/lib/supabase/middleware";
import { safeInternalPath } from "@/features/auth/redirect";

/**
 * Next.js 16 proxy (formerly middleware): session refresh + coarse redirects.
 * Fine-grained RBAC remains in server layouts via requireAdmin / requirePermission.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  let adminSegment: string;
  try {
    adminSegment = getAdminRouteSegment();
  } catch {
    return response;
  }

  const adminBase = `/${adminSegment}`;
  const isAdminArea =
    pathname === adminBase || pathname.startsWith(`${adminBase}/`);
  const isAdminLogin = pathname === `${adminBase}/login`;
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
    loginUrl.searchParams.set(
      "next",
      safeInternalPath(
        `${pathname}${request.nextUrl.search}`,
        `${adminBase}/dashboard`,
      ),
    );
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
