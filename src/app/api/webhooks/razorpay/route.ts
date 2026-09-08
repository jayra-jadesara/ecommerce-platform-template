import { NextResponse } from "next/server";
import { processRazorpayWebhook } from "@/features/payments/webhook";

export const runtime = "nodejs";

/**
 * Razorpay webhook — signature verified over the RAW body before JSON parse.
 * Configure this URL in the Razorpay Dashboard (webhooks).
 */
export async function POST(request: Request) {
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
