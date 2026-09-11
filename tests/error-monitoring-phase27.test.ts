import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildErrorFingerprint,
  generateErrorReferenceId,
  isValidErrorReferenceId,
  normalizeMessageForFingerprint,
} from "@/features/error-monitoring/reference";
import {
  extractErrorMessage,
  redactSecrets,
  sanitizeMetadata,
  sanitizeStack,
  sanitizeString,
} from "@/features/error-monitoring/sanitize";
import {
  isBrowserTabError,
  isPaymentRelated,
  pageNameFromRoute,
} from "@/features/error-monitoring/classify";
import {
  CUSTOMER_SAFE_MESSAGE,
  CUSTOMER_SAFE_TITLE,
  PAYMENT_SAFE_MESSAGE,
  ERROR_TYPES,
  ERROR_SOURCES,
} from "@/features/error-monitoring/types";
import { ERROR_LOG_RETENTION_DAYS } from "@/features/error-monitoring/retention";
import { hasPermission, ROLE_PERMISSIONS } from "@/features/auth/permissions";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Phase 27 — reference & fingerprint", () => {
  it("generates ERR-XXXXXXXX references", () => {
    const ref = generateErrorReferenceId();
    expect(isValidErrorReferenceId(ref)).toBe(true);
    expect(ref).toMatch(/^ERR-[0-9A-F]{8}$/);
  });

  it("builds stable fingerprints ignoring volatile ids", () => {
    const a = buildErrorFingerprint({
      type: "PAYMENT",
      source: "PROVIDER",
      operation: "VERIFY_PAYMENT",
      route: "/checkout",
      message: "fail 12345 uuid aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      fileName: "verify.ts",
      lineNumber: 10,
    });
    const b = buildErrorFingerprint({
      type: "PAYMENT",
      source: "PROVIDER",
      operation: "VERIFY_PAYMENT",
      route: "/checkout",
      message: "fail 99999 uuid ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      fileName: "verify.ts",
      lineNumber: 10,
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(32);
  });

  it("normalizes messages for fingerprinting", () => {
    expect(normalizeMessageForFingerprint("ERR-AB12CD34 boom")).toContain(
      "[ref]",
    );
  });
});

describe("Phase 27 — sanitization & redaction", () => {
  it("redacts bearer tokens and secrets in text", () => {
    const raw =
      "Authorization Bearer abcdefghijklmnop and sk_live_ABCDEFG123";
    expect(redactSecrets(raw)).toContain("[REDACTED]");
    expect(redactSecrets(raw)).not.toContain("sk_live_");
  });

  it("redacts secret metadata keys", () => {
    const meta = sanitizeMetadata({
      password: "secret",
      razorpay_secret: "rzp",
      orderId: "ok",
      token: "abc",
    });
    expect(meta.password).toBe("[REDACTED]");
    expect(meta.razorpay_secret).toBe("[REDACTED]");
    expect(meta.token).toBe("[REDACTED]");
    expect(meta.orderId).toBe("ok");
  });

  it("truncates long messages and stacks", () => {
    const long = "x".repeat(5000);
    expect(sanitizeString(long).length).toBeLessThanOrEqual(2001);
    expect((sanitizeStack(long) ?? "").length).toBeLessThanOrEqual(12001);
  });

  it("extracts error messages safely", () => {
    expect(extractErrorMessage(new Error("boom"))).toBe("boom");
    expect(extractErrorMessage("plain")).toBe("plain");
  });
});

describe("Phase 27 — classification", () => {
  it("routes browser/react/page to browser tab", () => {
    expect(
      isBrowserTabError({ error_source: "CLIENT", error_type: "API" }),
    ).toBe(true);
    expect(
      isBrowserTabError({ error_source: "SERVER", error_type: "REACT" }),
    ).toBe(true);
    expect(
      isBrowserTabError({ error_source: "SERVER", error_type: "DATABASE" }),
    ).toBe(false);
  });

  it("detects payment-related errors", () => {
    expect(
      isPaymentRelated({
        error_type: "PAYMENT",
        feature: null,
        payment_id: null,
      }),
    ).toBe(true);
    expect(
      isPaymentRelated({
        error_type: "SERVER",
        operation: "VERIFY_PAYMENT",
      }),
    ).toBe(true);
    expect(
      isPaymentRelated({ error_type: "CMS", feature: "CMS" }),
    ).toBe(false);
  });

  it("maps routes to page names", () => {
    expect(pageNameFromRoute("/checkout")).toBe("Checkout");
    expect(pageNameFromRoute("/products/slug")).toBe("Product Details");
  });
});

describe("Phase 27 — customer-safe messages", () => {
  it("never exposes technical wording in safe copy", () => {
    expect(CUSTOMER_SAFE_TITLE).toBe("Something went wrong.");
    expect(CUSTOMER_SAFE_MESSAGE.toLowerCase()).not.toContain("supabase");
    expect(CUSTOMER_SAFE_MESSAGE.toLowerCase()).not.toContain("stack");
    expect(PAYMENT_SAFE_MESSAGE.toLowerCase()).toContain("payment");
    expect(PAYMENT_SAFE_MESSAGE.toLowerCase()).not.toContain("signature");
  });
});

describe("Phase 27 — permissions & rate limit", () => {
  it("grants view/update correctly by role", () => {
    expect(hasPermission(["SUPER_ADMIN"], "error_logs.view")).toBe(true);
    expect(hasPermission(["SUPER_ADMIN"], "error_logs.update")).toBe(true);
    expect(hasPermission(["ADMIN"], "error_logs.view")).toBe(true);
    expect(hasPermission(["ADMIN"], "error_logs.update")).toBe(true);
    expect(hasPermission(["EDITOR"], "error_logs.view")).toBe(true);
    expect(ROLE_PERMISSIONS.EDITOR.includes("error_logs.update")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "error_logs.view")).toBe(true);
    expect(
      ROLE_PERMISSIONS.ORDER_MANAGER.includes("error_logs.update"),
    ).toBe(false);
  });

  it("adds errors rate limit bucket", () => {
    expect(RATE_LIMITS.errors.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.errors.windowMs).toBeGreaterThan(0);
  });

  it("documents 90-day retention", () => {
    expect(ERROR_LOG_RETENTION_DAYS).toBe(90);
  });
});

describe("Phase 27 — architecture contracts", () => {
  it("ships migration with RLS and no public insert", () => {
    const sql = read("supabase/migrations/20260911230000_error_logs.sql");
    expect(sql).toContain("create table if not exists public.error_logs");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("error_logs_admin_select");
    expect(sql).toContain("error_logs_admin_update");
    expect(sql).not.toContain("for insert");
    expect(sql).toContain("reference_id");
    expect(sql).toContain("fingerprint");
    expect(sql).toContain("occurrence_count");
  });

  it("exposes browser ingest API with rate limiting", () => {
    const route = read("src/app/api/errors/route.ts");
    expect(route).toContain("RATE_LIMITS.errors");
    expect(route).toContain("checkRateLimit");
    expect(route).toContain("persistErrorLog");
    expect(route).toContain("resolveActiveStoreId");
    expect(route).toContain("getCurrentUser");
    expect(route).not.toContain("createSupabaseBrowserClient");
  });

  it("captures browser, react, and page errors", () => {
    const capture = read(
      "src/features/error-monitoring/client/GlobalErrorCapture.tsx",
    );
    const boundary = read(
      "src/features/error-monitoring/client/AppErrorBoundary.tsx",
    );
    const storefront = read("src/app/(storefront)/error.tsx");
    const global = read("src/app/global-error.tsx");
    expect(capture).toContain("unhandledrejection");
    expect(capture).toContain('addEventListener("error"');
    expect(boundary).toContain("componentDidCatch");
    expect(boundary).toContain("reportClientError");
    expect(storefront).toContain("reportClientErrorAsync");
    expect(storefront).toContain("CUSTOMER_SAFE_MESSAGE");
    expect(global).toContain("reportClientError");
    expect(global).toContain("CUSTOMER_SAFE_MESSAGE");
  });

  it("wires payment / razorpay / webhook / finalize logging", () => {
    const checkout = read("src/features/payments/checkout-session.ts");
    const verify = read("src/features/payments/verify.ts");
    const webhook = read("src/features/payments/webhook.ts");
    const finalize = read("src/features/orders/finalize.ts");
    expect(checkout).toContain("logPaymentError");
    expect(checkout).toContain("PROVIDER_ORDER_FAILED");
    expect(verify).toContain("SIGNATURE_INVALID");
    expect(verify).toContain("AMOUNT_MISMATCH");
    expect(verify).toContain("logPaymentError");
    expect(webhook).toContain("WEBHOOK_SIGNATURE_INVALID");
    expect(webhook).toContain("UNSUPPORTED_WEBHOOK_EVENT");
    expect(webhook).toContain("logPaymentError");
    expect(finalize).toContain("INVENTORY_FINALIZATION_FAILED");
    expect(finalize).toContain("COUPON_REDEMPTION_FAILED");
  });

  it("ships Admin Error Logs UI with two tabs", () => {
    const page = read(
      "src/app/(admin)/[adminSlug]/(protected)/error-logs/page.tsx",
    );
    const client = read(
      "src/features/error-monitoring/components/AdminErrorLogsClient.tsx",
    );
    const detail = read(
      "src/features/error-monitoring/components/AdminErrorLogDetailClient.tsx",
    );
    const nav = read("src/features/admin/nav.ts");
    expect(page).toContain("Error Logs");
    expect(page).toContain("error_logs.view");
    expect(client).toContain("Page & Browser Errors");
    expect(client).toContain("Database & Server Errors");
    expect(client).toContain("Payment");
    expect(detail).toContain("Technical Details");
    expect(detail).toContain("Payment Details");
    expect(detail).toContain("Mark Resolved");
    expect(nav).toContain("error-logs");
    expect(nav).toContain("error_logs.view");
  });

  it("uses allow-listed types and sources", () => {
    expect(ERROR_TYPES).toContain("PAYMENT");
    expect(ERROR_TYPES).toContain("WEBHOOK");
    expect(ERROR_SOURCES).toContain("CLIENT");
    expect(ERROR_SOURCES).toContain("WEBHOOK");
  });

  it("central logger never recursively logs failures", () => {
    const persist = read("src/features/error-monitoring/persist.ts");
    expect(persist).toContain("loggingInProgress");
    expect(persist).toContain("console.error");
  });
});
