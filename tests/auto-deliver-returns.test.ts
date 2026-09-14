import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHIPPING_SETTINGS,
  shippingSettingsSchema,
} from "@/features/admin/settings/shipping-payment-schemas";
import {
  DEFAULT_PRODUCT_FORM,
  productFormSchema,
} from "@/features/catalog/validation";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("auto-deliver + returns policy", () => {
  it("defaults shipping to auto-deliver in 7 days", () => {
    expect(DEFAULT_SHIPPING_SETTINGS.fulfillmentMode).toBe("auto_days");
    expect(DEFAULT_SHIPPING_SETTINGS.autoDeliverAfterDays).toBe(7);
    expect(DEFAULT_SHIPPING_SETTINGS.returnPolicy).toBe("no_return_refund");
  });

  it("accepts auto-deliver days and requires them for auto mode", () => {
    const on = shippingSettingsSchema.safeParse({
      ...DEFAULT_SHIPPING_SETTINGS,
      autoDeliverAfterDays: 5,
    });
    expect(on.success).toBe(true);
    if (on.success) expect(on.data.autoDeliverAfterDays).toBe(5);

    const missingDays = shippingSettingsSchema.safeParse({
      ...DEFAULT_SHIPPING_SETTINGS,
      fulfillmentMode: "auto_days",
      autoDeliverAfterDays: "",
    });
    expect(missingDays.success).toBe(false);

    const tooHigh = shippingSettingsSchema.safeParse({
      ...DEFAULT_SHIPPING_SETTINGS,
      autoDeliverAfterDays: 90,
    });
    expect(tooHigh.success).toBe(false);
  });

  it("clears auto-deliver days when courier API is selected", () => {
    const parsed = shippingSettingsSchema.safeParse({
      ...DEFAULT_SHIPPING_SETTINGS,
      fulfillmentMode: "courier_api",
      returnPolicy: "replace_only",
      autoDeliverAfterDays: 7,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fulfillmentMode).toBe("courier_api");
      expect(parsed.data.autoDeliverAfterDays).toBeNull();
      expect(parsed.data.returnPolicy).toBe("replace_only");
    }
  });

  it("defaults products to inherit store return policy (null)", () => {
    expect(DEFAULT_PRODUCT_FORM.returnPolicy).toBeNull();
    const parsed = productFormSchema.safeParse({
      ...DEFAULT_PRODUCT_FORM,
      name: "Garam Masala",
      slug: "garam-masala",
      variants: [
        {
          ...DEFAULT_PRODUCT_FORM.variants[0],
          sku: "GM-100",
          price: 120,
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.returnPolicy).toBeNull();
    }
  });

  it("ships migrations + cron route", () => {
    const migration = readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20260913210000_auto_deliver_and_returns.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("auto_deliver_after_days");
    expect(migration).toContain("returns_allowed");

    const migration2 = readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20260913220000_fulfillment_and_return_policy.sql",
      ),
      "utf8",
    );
    expect(migration2).toContain("fulfillment_mode");
    expect(migration2).toContain("return_policy");

    const migration3 = readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20260913230000_order_replace_requests.sql",
      ),
      "utf8",
    );
    expect(migration3).toContain("order_replace_requests");
    expect(migration3).toContain("replace_photo_required");
    expect(migration3).toContain("replacements");

    const cron = readFileSync(
      path.join(process.cwd(), "src/app/api/cron/auto-deliver/route.ts"),
      "utf8",
    );
    expect(cron).toContain("CRON_SECRET");
    expect(cron).toContain("autoDeliverShippedOrders");
  });

  it("defaults replace photo required to off (save storage)", () => {
    expect(DEFAULT_SHIPPING_SETTINGS.replacePhotoRequired).toBe(false);
  });
});
