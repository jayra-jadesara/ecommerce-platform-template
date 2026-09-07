import { createHmac, timingSafeEqual } from "node:crypto";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Parse and verify signed guest cart cookie. Returns UUID token or null. */
export function parseGuestCartCookieValue(
  raw: string | undefined,
  secret: string,
): string | null {
  if (!raw || !secret) return null;

  const [token, signature] = raw.split(".");
  if (!token || !signature) return null;
  if (!UUID_RE.test(token)) return null;

  const expected = signToken(token, secret);
  if (!safeEqual(signature, expected)) return null;
  return token;
}

export function buildGuestCartCookieValue(token: string, secret: string): string {
  if (!secret) {
    throw new Error("Guest cart signing secret is required.");
  }
  if (!UUID_RE.test(token)) {
    throw new Error("Guest cart token must be a UUID.");
  }
  return `${token}.${signToken(token, secret)}`;
}

/** Assert store scoping for cart/wishlist operations. */
export function assertSameStore(
  resourceStoreId: string,
  activeStoreId: string,
): boolean {
  return resourceStoreId === activeStoreId;
}

/** Cross-user access must be rejected when session user differs from owner. */
export function assertCartOwner(
  cartUserId: string | null,
  sessionUserId: string | null,
): boolean {
  if (!cartUserId || !sessionUserId) return false;
  return cartUserId === sessionUserId;
}
