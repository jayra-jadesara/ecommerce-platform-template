import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import {
  hasPermission,
  ROLE_PERMISSIONS,
} from "@/features/auth/permissions";
import { safeAdminNextPath, safeInternalPath } from "@/features/auth/redirect";
import {
  buildGuestCartCookieValue,
  parseGuestCartCookieValue,
  assertCartOwner,
  assertSameStore,
} from "@/features/cart/guest-token";
import { calculateCouponDiscount } from "@/features/coupons/discount";
import { assertSafeStoragePath } from "@/features/media/validation";
import { isSafeModelStoragePath } from "@/features/visual-effects";
import { parseInventoryRpcResult } from "@/features/orders/inventory-result";
import {
  canTransitionPaymentStatus,
  preferPaymentStatus,
} from "@/features/payments/state-machine";
import {
  computeRazorpayCheckoutSignature,
  verifyRazorpayCheckoutSignaturePure,
  verifyRazorpayWebhookSignaturePure,
  computeRazorpayWebhookSignature,
} from "@/features/payments/providers/razorpay-crypto";
import { calculateOrderPricing } from "@/features/pricing/engine";
import { majorToMinor } from "@/features/pricing/money";
import { isPrivateCachePath } from "@/features/pwa";
import { isSafeHttpUrl, isSafeNavHref } from "@/features/admin/settings/validation";
import { safeUrlSchema } from "@/features/cms/schemas";
import { serializeJsonLd } from "@/features/seo/json-ld";
import {
  checkRateLimit,
  resetRateLimitBuckets,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import { SECURITY_HEADER_ENTRIES } from "@/lib/security/headers";

describe("RBAC regressions", () => {
  it("denies customer-equivalent empty roles admin permissions", () => {
    expect(hasPermission([], "settings.update")).toBe(false);
    expect(hasPermission([], "products.update")).toBe(false);
    expect(hasPermission([], "orders.update")).toBe(false);
  });

  it("denies EDITOR admin-only payment/settings mutations", () => {
    expect(hasPermission(["EDITOR"], "payments.update")).toBe(false);
    expect(hasPermission(["EDITOR"], "settings.update")).toBe(false);
    expect(hasPermission(["EDITOR"], "users.manage")).toBe(false);
    expect(hasPermission(["EDITOR"], "coupons.create")).toBe(false);
  });

  it("denies ORDER_MANAGER catalog mutations", () => {
    expect(hasPermission(["ORDER_MANAGER"], "products.create")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "products.update")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "categories.delete")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "media.upload")).toBe(false);
    expect(ROLE_PERMISSIONS.ORDER_MANAGER.includes("orders.update")).toBe(true);
  });
});

describe("open redirect hardening", () => {
  it("rejects protocol-relative, encoded, and @ tricks", () => {
    expect(safeInternalPath("//evil.test")).toBe("/");
    expect(safeInternalPath("/%2f%2fevil.test")).toBe("/");
    expect(safeInternalPath("/\\evil")).toBe("/");
    expect(safeInternalPath("/account@evil.test")).toBe("/");
    expect(safeInternalPath("https://evil.test")).toBe("/");
    expect(safeInternalPath("javascript:alert(1)")).toBe("/");
  });

  it("rejects admin login loop destinations", () => {
    expect(
      safeAdminNextPath(
        "/manage-store/login?x=1",
        "/manage-store",
        "/manage-store/dashboard",
      ),
    ).toBe("/manage-store/dashboard");
  });
});

describe("guest cart HMAC", () => {
  const secret = "guest-cart-test-secret";

  it("accepts valid signed tokens and rejects forgery", () => {
    const token = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const cookie = buildGuestCartCookieValue(token, secret);
    expect(parseGuestCartCookieValue(cookie, secret)).toBe(token);
    expect(parseGuestCartCookieValue(`${token}.deadbeef`, secret)).toBeNull();
    expect(parseGuestCartCookieValue(cookie, "other-secret")).toBeNull();
    expect(parseGuestCartCookieValue(undefined, secret)).toBeNull();
  });

  it("rejects cross-user and cross-store ownership claims", () => {
    expect(assertCartOwner("user-a", "user-b")).toBe(false);
    expect(assertCartOwner("user-a", "user-a")).toBe(true);
    expect(assertSameStore("store-a", "store-b")).toBe(false);
    expect(assertSameStore("store-a", "store-a")).toBe(true);
  });
});

describe("pricing authority (client totals ignored)", () => {
  it("computes grand total from engine inputs — not a client-supplied total", () => {
    const outcome = calculateOrderPricing({
      currency: "INR",
      lines: [
        {
          productId: "p1",
          variantId: "v1",
          quantity: 2,
          unitPriceMinor: majorToMinor(250, "INR"),
        },
      ],
      shipping: {
        enabled: true,
        method: "flat_rate",
        freeShippingThresholdMinor: null,
        defaultShippingFeeMinor: majorToMinor(40, "INR"),
        percentageRate: null,
      },
      paymentFee: {
        enabled: false,
        feeType: "PERCENTAGE",
        feeValue: 0,
        feeBasis: "SUBTOTAL_PLUS_SHIPPING",
      },
      tax: { enabled: false, taxType: "PERCENTAGE", taxValue: 0 },
      discount: { amountMinor: 0 },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // Client claiming a lower total must not be representable here — engine owns math
    expect(outcome.pricing.grandTotal.major).toBe(540);
    expect(outcome.pricing.subtotal.major).toBe(500);
    expect(outcome.pricing.shipping.major).toBe(40);
  });

  it("rejects negative discount abuse via coupon math", () => {
    const bad = calculateCouponDiscount({
      discountType: "fixed",
      discountValue: -10,
      maximumDiscountAmount: null,
      subtotalMinor: 10_000,
      currency: "INR",
    });
    expect(bad.ok).toBe(false);
  });
});

describe("payment signature / amount / transition", () => {
  const secret = "rzp_test_secret";

  it("rejects signature mismatch and altered payment id", () => {
    const orderId = "order_1";
    const paymentId = "pay_1";
    const signature = computeRazorpayCheckoutSignature(orderId, paymentId, secret);
    expect(
      verifyRazorpayCheckoutSignaturePure({
        orderId,
        paymentId,
        signature,
        secret,
      }),
    ).toBe(true);
    expect(
      verifyRazorpayCheckoutSignaturePure({
        orderId,
        paymentId: "pay_altered",
        signature,
        secret,
      }),
    ).toBe(false);
  });

  it("rejects invalid webhook signatures", () => {
    const rawBody = JSON.stringify({ event: "payment.captured", id: "evt_1" });
    const signature = computeRazorpayWebhookSignature(rawBody, secret);
    expect(
      verifyRazorpayWebhookSignaturePure({ rawBody, signature, secret }),
    ).toBe(true);
    expect(
      verifyRazorpayWebhookSignaturePure({
        rawBody: rawBody.replace("captured", "failed"),
        signature,
        secret,
      }),
    ).toBe(false);
  });

  it("rejects backward payment transitions", () => {
    expect(canTransitionPaymentStatus("CAPTURED", "AUTHORIZED")).toBe(false);
    expect(canTransitionPaymentStatus("REFUNDED", "CAPTURED")).toBe(false);
    expect(preferPaymentStatus("CAPTURED", "AUTHORIZED")).toBe("CAPTURED");
  });
});

describe("inventory RPC idempotency parsing", () => {
  it("treats already_finalized / already_restored as successful no-ops", () => {
    expect(
      parseInventoryRpcResult({
        ok: true,
        already_finalized: true,
      }).alreadyFinalized,
    ).toBe(true);
    expect(
      parseInventoryRpcResult({
        ok: true,
        already_restored: true,
      }).alreadyRestored,
    ).toBe(true);
  });
});

describe("storage / 3D path safety", () => {
  it("rejects path traversal", () => {
    expect(assertSafeStoragePath("../etc/passwd")).toBe(false);
    expect(assertSafeStoragePath("products/../../secret")).toBe(false);
    expect(assertSafeStoragePath("/absolute")).toBe(false);
    expect(
      assertSafeStoragePath(
        "products/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/img.webp",
      ),
    ).toBe(true);
  });

  it("rejects arbitrary remote 3D model URLs", () => {
    expect(isSafeModelStoragePath("https://evil.test/model.glb")).toBe(false);
    expect(isSafeModelStoragePath("../../x.glb")).toBe(false);
  });
});

describe("XSS / unsafe URL rejection", () => {
  it("blocks javascript and data URLs", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html;base64,xxxx")).toBe(false);
    expect(isSafeNavHref("javascript:alert(1)")).toBe(false);
    expect(safeUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(safeUrlSchema.safeParse("/products").success).toBe(true);
  });

  it("escapes JSON-LD angle brackets", () => {
    const html = serializeJsonLd({
      "@type": "Product",
      name: "</script><script>alert(1)</script>",
    });
    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c");
  });
});

describe("PWA / private cache exclusion", () => {
  it("excludes account, cart, checkout, payment, admin, api", () => {
    expect(isPrivateCachePath("/account/orders")).toBe(true);
    expect(isPrivateCachePath("/cart")).toBe(true);
    expect(isPrivateCachePath("/checkout")).toBe(true);
    expect(isPrivateCachePath("/payment/success")).toBe(true);
    expect(isPrivateCachePath("/api/webhooks/razorpay")).toBe(true);
    expect(isPrivateCachePath("/manage-store/orders", "manage-store")).toBe(
      true,
    );
    expect(isPrivateCachePath("/products")).toBe(false);
  });
});

describe("security headers + secrets hygiene", () => {
  it("defines baseline headers including CSP frame-ancestors", () => {
    const keys = SECURITY_HEADER_ENTRIES.map((h) => h.key);
    expect(keys).toContain("Content-Security-Policy");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    const csp = SECURITY_HEADER_ENTRIES.find(
      (h) => h.key === "Content-Security-Policy",
    )?.value;
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("checkout.razorpay.com");
  });

  it("does not expose secrets via NEXT_PUBLIC_ in .env.example", () => {
    const example = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
    expect(example).not.toMatch(/NEXT_PUBLIC_.*SECRET/);
    expect(example).not.toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE/);
    expect(example).toContain("GUEST_CART_SECRET=");
    expect(example).toContain("SUPABASE_SERVICE_ROLE_KEY=");
  });

  it("service-role admin module is server-only", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/supabase/admin.ts"),
      "utf8",
    );
    expect(src).toContain('import "server-only"');
    expect(src).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});

describe("rate limiter", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it("allows within limit then blocks", () => {
    const key = "test:ip";
    for (let i = 0; i < 3; i += 1) {
      expect(
        checkRateLimit({ key, limit: 3, windowMs: 60_000 }).allowed,
      ).toBe(true);
    }
    expect(checkRateLimit({ key, limit: 3, windowMs: 60_000 }).allowed).toBe(
      false,
    );
    expect(RATE_LIMITS.auth.limit).toBeGreaterThan(0);
  });
});

describe("security migration presence", () => {
  it("drops client order inserts and public media read", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260908200000_security_hardening.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("drop policy if exists orders_insert_own");
    expect(sql).toContain("drop policy if exists order_items_insert_own_order");
    expect(sql).toContain("drop policy if exists media_public_read");
    expect(sql).toContain("coupons_admin_write");
  });
});
