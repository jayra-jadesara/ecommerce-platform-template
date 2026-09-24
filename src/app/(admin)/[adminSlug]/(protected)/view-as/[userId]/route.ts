import { NextResponse } from "next/server";
import { getAdminPath } from "@/config/admin-route";
import { startStaffViewSession } from "@/features/auth/staff-view-session";

const STAFF_VIEW_FLASH_COOKIE = "wl_staff_view_flash";

type RouteContext = {
  params: Promise<{ userId: string; adminSlug: string }>;
};

/**
 * Super Admin: open in a new tab from Team.
 * Issues a URL-scoped staff-view token (no shared cookie) so this tab shows
 * staff menus/rights while other tabs keep Super Admin access.
 */
export async function GET(request: Request, context: RouteContext) {
  const { userId } = await context.params;
  const result = await startStaffViewSession(userId);
  const origin = new URL(request.url).origin;

  if (!result.ok) {
    const teamUrl = new URL(
      getAdminPath("/team", { staffViewToken: null }),
      origin,
    );
    const response = NextResponse.redirect(teamUrl);
    // Flash via cookie (Route Handler may set cookies). Avoids ?staffViewError=
    // and client useEffect URL cleanup that tripped React Fast Refresh.
    response.cookies.set(STAFF_VIEW_FLASH_COOKIE, result.error, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 120,
    });
    return response;
  }

  return NextResponse.redirect(
    new URL(
      getAdminPath("/dashboard", { staffViewToken: result.token }),
      origin,
    ),
  );
}
