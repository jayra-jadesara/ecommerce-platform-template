import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Pure helpers for unit tests and provider verification (no env required). */
export function computeRazorpayCheckoutSignature(
  orderId: string,
  paymentId: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

export function computeRazorpayWebhookSignature(
  rawBody: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyRazorpayCheckoutSignaturePure(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = computeRazorpayCheckoutSignature(
    input.orderId,
    input.paymentId,
    input.secret,
  );
  return safeEqualHex(expected, input.signature);
}

export function verifyRazorpayWebhookSignaturePure(input: {
  rawBody: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = computeRazorpayWebhookSignature(input.rawBody, input.secret);
  return safeEqualHex(expected, input.signature);
}
