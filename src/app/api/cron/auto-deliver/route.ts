import { NextResponse } from "next/server";
import { autoDeliverShippedOrders } from "@/features/orders/auto-deliver";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Optional scheduled endpoint. Protect with CRON_SECRET:
 * Authorization: Bearer <CRON_SECRET>  or  ?secret=<CRON_SECRET>
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

  const result = await autoDeliverShippedOrders({ limit: 100 });
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
