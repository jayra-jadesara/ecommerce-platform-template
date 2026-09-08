import { NextResponse } from "next/server";
import { processRazorpayWebhook } from "@/features/payments/webhook";

export const runtime = "nodejs";

/**
 * Razorpay webhook — signature verified over the RAW body before JSON parse.
 * Configure this URL in the Razorpay Dashboard (webhooks).
 */
export async function POST(request: Request) {
  const { checkRateLimit, RATE_LIMITS } = await import(
    "@/lib/security/rate-limit"
  );
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const limited = checkRateLimit({
    key: `webhook:${ip}`,
    limit: RATE_LIMITS.webhook.limit,
    windowMs: RATE_LIMITS.webhook.windowMs,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(limited.retryAfterMs / 1000))),
        },
      },
    );
  }

  const signature = request.headers.get("x-razorpay-signature");
  const rawBody = await request.text();

  const result = await processRazorpayWebhook({
    rawBody,
    signature,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ received: true, ignored: Boolean(result.ignored) });
}
