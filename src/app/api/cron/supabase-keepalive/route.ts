import { NextResponse } from "next/server";
import { pingSupabaseDatabaseKeepAlive } from "@/features/platform-usage/supabase-usage-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Keeps Free Supabase projects from pausing: real DB query every schedule tick.
 * Protect with CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>
 *   or ?secret=<CRON_SECRET>
 *
 * Vercel cron: every 2 days (see vercel.json).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret")?.trim() ?? "";

  if (bearer !== secret && querySecret !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const result = await pingSupabaseDatabaseKeepAlive();
  return NextResponse.json(
    {
      ok: result.ok,
      message: result.message,
      at: new Date().toISOString(),
    },
    { status: result.ok ? 200 : 500 },
  );
}

export async function POST(request: Request) {
  return GET(request);
}
