/**
 * Map route paths to friendly page names for Admin context.
 */
const ROUTE_NAMES: Array<{ test: RegExp; name: string }> = [
  { test: /^\/checkout\/?$/, name: "Checkout" },
  { test: /^\/cart\/?$/, name: "Cart" },
  { test: /^\/payment\/(success|failed)/, name: "Payment" },
  { test: /^\/products\//, name: "Product Details" },
  { test: /^\/products\/?$/, name: "Products" },
  { test: /^\/account\/orders/, name: "Account Orders" },
  { test: /^\/account/, name: "Account" },
  { test: /^\/blog\//, name: "Blog Post" },
  { test: /^\/blog\/?$/, name: "Blog" },
  { test: /\/catalog\/products/, name: "Admin Product Editor" },
  { test: /\/orders\//, name: "Order Details" },
  { test: /\/orders\/?$/, name: "Orders" },
  { test: /\/content\/blog/, name: "Blog Editor" },
  { test: /\/content\//, name: "Content Editor" },
  { test: /\/settings\/theme/, name: "Appearance" },
  { test: /\/settings\/payments/, name: "Payments Settings" },
  { test: /\/error-logs/, name: "Error Logs" },
  { test: /\/dashboard/, name: "Dashboard" },
  { test: /^\/api\/webhooks\/razorpay/, name: "Razorpay Webhook" },
  { test: /^\/api\/errors/, name: "Error Ingestion" },
];

export function pageNameFromRoute(route: string | null | undefined): string | null {
  if (!route) return null;
  const path = route.split("?")[0] ?? route;
  for (const entry of ROUTE_NAMES) {
    if (entry.test.test(path)) return entry.name;
  }
  if (path.startsWith("/")) {
    const segment = path.split("/").filter(Boolean)[0];
    if (segment) {
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  }
  return null;
}

/** Tab 1 = Page & Browser; Tab 2 = Database & Server. */
export function isBrowserTabError(input: {
  error_source: string;
  error_type: string;
}): boolean {
  if (input.error_source === "CLIENT") return true;
  return (
    input.error_type === "BROWSER" ||
    input.error_type === "REACT" ||
    input.error_type === "PAGE"
  );
}

export function isPaymentRelated(input: {
  error_type?: string | null;
  feature?: string | null;
  payment_id?: string | null;
  provider?: string | null;
  operation?: string | null;
}): boolean {
  if (input.error_type === "PAYMENT" || input.error_type === "WEBHOOK") return true;
  if (input.feature === "PAYMENT" || input.feature === "CHECKOUT") return true;
  if (input.payment_id) return true;
  if ((input.provider ?? "").toLowerCase() === "razorpay") return true;
  const op = (input.operation ?? "").toUpperCase();
  return (
    op.includes("PAYMENT") ||
    op.includes("WEBHOOK") ||
    op.includes("RAZORPAY") ||
    op.includes("CHECKOUT") ||
    op.includes("VERIFY")
  );
}
