import { NextResponse, type NextRequest } from "next/server";
import { getAdminPath } from "@/config/admin-route";
import { SESSION_STARTED_COOKIE } from "@/features/auth/proxy-auth-headers";
import { safeInternalPath } from "@/features/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Clears Supabase auth + login-start cookies when a session max is exceeded.
 * Must run as a Route Handler — RSC cannot mutate cookies.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const nextRaw = request.nextUrl.searchParams.get("next");
  const nextPath = safeInternalPath(
    nextRaw,
    getAdminPath("/login", { staffViewToken: null }),
  );

  const loginUrl = new URL(nextPath, request.url);
  if (!loginUrl.searchParams.has("reason")) {
    loginUrl.searchParams.set("reason", "session_expired");
  }

  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(SESSION_STARTED_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
