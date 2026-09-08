import "server-only";

export type RazorpayEnv = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
};

/**
 * Server-only Razorpay credentials. Never import from Client Components.
 * Key ID may be returned to the browser for Checkout.js — secrets must not.
 */
export function getRazorpayEnv(): RazorpayEnv {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? "";

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }

  return { keyId, keySecret, webhookSecret };
}

export function getRazorpayEnvOptional(): RazorpayEnv | null {
  try {
    return getRazorpayEnv();
  } catch {
    return null;
  }
}

export function hasRazorpayWebhookSecret(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim());
}
