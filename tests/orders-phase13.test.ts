import { describe, expect, it } from "vitest";
import {
  canTransitionOrderStatus,
  orderStatusLabel,
} from "@/features/orders/state-machine";
import { parseInventoryRpcResult } from "@/features/orders/inventory-result";
import { canTransitionPaymentStatus } from "@/features/payments/state-machine";

describe("order status machine", () => {
  it("allows fulfillment transitions and rejects invalid ones", () => {
    expect(canTransitionOrderStatus("CONFIRMED", "PROCESSING")).toBe(true);
    expect(canTransitionOrderStatus("PROCESSING", "SHIPPED")).toBe(true);
    expect(canTransitionOrderStatus("SHIPPED", "DELIVERED")).toBe(true);
    expect(canTransitionOrderStatus("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransitionOrderStatus("DELIVERED", "PROCESSING")).toBe(false);
    expect(canTransitionOrderStatus("CANCELLED", "CONFIRMED")).toBe(false);
  });

  it("labels statuses for UI", () => {
    expect(orderStatusLabel("CONFIRMED")).toBe("Confirmed");
    expect(orderStatusLabel("SHIPPED")).toBe("Shipped");
  });
});

describe("inventory rpc result parsing", () => {
  it("normalizes snake_case idempotency flags", () => {
    expect(
      parseInventoryRpcResult({
        ok: true,
        already_finalized: true,
        shortages: [],
      }),
    ).toEqual({
      ok: true,
      alreadyFinalized: true,
      alreadyRestored: false,
      nothingToRestore: false,
      shortages: [],
      error: undefined,
    });
  });

  it("marks restore idempotency", () => {
    const result = parseInventoryRpcResult({
      ok: true,
      already_restored: true,
    });
    expect(result.alreadyRestored).toBe(true);
    expect(result.ok).toBe(true);
  });
});

describe("failed payment must not look like a paid order", () => {
  it("keeps payment FAILED from becoming CAPTURED via transition rules", () => {
    expect(canTransitionPaymentStatus("FAILED", "CAPTURED")).toBe(false);
    expect(canTransitionPaymentStatus("PENDING", "FAILED")).toBe(true);
  });
});

describe("orders feature wiring", () => {
  it("exposes admin and customer order routes", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const adminList = readFileSync(
      resolve(
        process.cwd(),
        "src/app/(admin)/[adminSlug]/(protected)/orders/page.tsx",
      ),
      "utf8",
    );
    const adminDetail = readFileSync(
      resolve(
        process.cwd(),
        "src/app/(admin)/[adminSlug]/(protected)/orders/[id]/page.tsx",
      ),
      "utf8",
    );
    const customerList = readFileSync(
      resolve(process.cwd(), "src/app/(storefront)/account/orders/page.tsx"),
      "utf8",
    );
    const customerDetail = readFileSync(
      resolve(
        process.cwd(),
        "src/app/(storefront)/account/orders/[id]/page.tsx",
      ),
      "utf8",
    );
    const fulfillment = readFileSync(
      resolve(process.cwd(), "src/features/payments/fulfillment.ts"),
      "utf8",
    );

    expect(adminList).toContain("AdminOrderListClient");
    expect(adminDetail).toContain("AdminOrderDetailClient");
    expect(customerList).toContain("listCustomerOrders");
    expect(customerDetail).toContain("getOrderDetail");
    expect(customerDetail).toContain("userId: user.id");
    expect(fulfillment).toContain("finalizePaidOrder");
  });

  it("defines atomic inventory migration helpers", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260908140000_orders_inventory_finalization.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("finalize_order_inventory");
    expect(sql).toContain("restore_order_inventory");
    expect(sql).toContain("inventory_movements");
    expect(sql).toContain("order_activities");
    expect(sql).toContain("inventory_finalized_at");
    expect(sql).toContain("unique (order_item_id, movement_type)");
  });
});
