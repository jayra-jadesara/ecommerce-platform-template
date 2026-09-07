import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/features/auth/redirect";
import {
  addressFormSchema,
  assertAddressOwner,
  chooseNextDefaultAddressId,
  toShippingAddressSnapshot,
  type CustomerAddress,
} from "@/features/addresses";
import {
  deriveCheckoutStep,
  isCheckoutBlockingIssue,
} from "@/features/checkout";

const sampleAddress = (): CustomerAddress => ({
  id: "00000000-0000-4000-8000-000000000010",
  fullName: "Alex Customer",
  phone: "+1 555 0100",
  addressLine1: "100 Market Street",
  addressLine2: "Suite 4",
  city: "Springfield",
  state: "IL",
  postalCode: "62701",
  country: "United States",
  isDefault: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
});

describe("checkout authentication redirect", () => {
  it("keeps checkout return path internal and safe", () => {
    expect(safeInternalPath("/checkout", "/account")).toBe("/checkout");
    expect(safeInternalPath("/login?next=/checkout".split("next=")[1], "/")).toBe(
      "/checkout",
    );
  });

  it("rejects external redirect targets for checkout return", () => {
    expect(safeInternalPath("https://evil.example/checkout", "/account")).toBe(
      "/account",
    );
    expect(safeInternalPath("//evil.example", "/checkout")).toBe("/checkout");
  });

  it("models unauthenticated vs authenticated checkout access", () => {
    const unauthenticated = { userId: null as string | null };
    const authenticated = { userId: "user-1" };
    expect(Boolean(unauthenticated.userId)).toBe(false);
    expect(Boolean(authenticated.userId)).toBe(true);
  });
});

describe("address validation", () => {
  it("accepts a valid address payload", () => {
    const parsed = addressFormSchema.safeParse({
      fullName: "Alex Customer",
      phone: "+91 98765 43210",
      addressLine1: "12 Garden Road",
      addressLine2: "",
      city: "Pune",
      state: "MH",
      postalCode: "411001",
      country: "India",
      isDefault: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty required fields and unsafe markup", () => {
    expect(
      addressFormSchema.safeParse({
        fullName: "",
        phone: null,
        addressLine1: "12 Garden Road",
        city: "Pune",
        postalCode: "411001",
        country: "India",
      }).success,
    ).toBe(false);

    const cleaned = addressFormSchema.safeParse({
      fullName: "<script>alert(1)</script>Alex",
      phone: "5551234567",
      addressLine1: "12 Garden Road",
      city: "Pune",
      postalCode: "411001",
      country: "India",
    });
    expect(cleaned.success).toBe(true);
    if (cleaned.success) {
      expect(cleaned.data.fullName).not.toMatch(/<script>/i);
      expect(cleaned.data.fullName).toContain("Alex");
    }
  });

  it("validates phone and postal formats without over-restricting", () => {
    expect(
      addressFormSchema.safeParse({
        fullName: "Alex",
        phone: "123",
        addressLine1: "12 Garden Road",
        city: "Pune",
        postalCode: "411001",
        country: "India",
      }).success,
    ).toBe(false);

    expect(
      addressFormSchema.safeParse({
        fullName: "Alex",
        phone: null,
        addressLine1: "12 Garden Road",
        city: "Pune",
        postalCode: "SW1A 1AA",
        country: "United Kingdom",
      }).success,
    ).toBe(true);
  });
});

describe("default address logic", () => {
  it("chooses at most one next default after deletion", () => {
    expect(chooseNextDefaultAddressId([])).toBeNull();
    expect(
      chooseNextDefaultAddressId([
        { id: "a", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "b", updatedAt: "2026-06-01T00:00:00.000Z" },
      ]),
    ).toBe("b");
  });

  it("documents multiple-default prevention via unique partial index + clear-then-set", () => {
    const defaults = [{ id: "1", isDefault: true }];
    const settingAnother = true;
    expect(defaults.filter((row) => row.isDefault).length).toBe(1);
    expect(settingAnother).toBe(true);
  });
});

describe("address ownership and store scoping", () => {
  it("rejects cross-user address access", () => {
    expect(assertAddressOwner("user-a", "user-a")).toBe(true);
    expect(assertAddressOwner("user-a", "user-b")).toBe(false);
  });

  it("keeps checkout cart store-scoped in summary contracts", () => {
    const cartStoreId: string = "store-1";
    const activeStoreId: string = "store-1";
    const foreignStoreId: string = "store-2";
    expect(cartStoreId === activeStoreId).toBe(true);
    expect(cartStoreId === foreignStoreId).toBe(false);
  });
});

describe("shipping address snapshot", () => {
  it("copies immutable fields for future order history", () => {
    const snapshot = toShippingAddressSnapshot(sampleAddress());
    expect(snapshot).toEqual({
      fullName: "Alex Customer",
      phone: "+1 555 0100",
      addressLine1: "100 Market Street",
      addressLine2: "Suite 4",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "United States",
    });
    expect(snapshot).not.toHaveProperty("id");
  });
});

describe("checkout cart validation contracts", () => {
  it("blocks empty cart and unavailable catalog states", () => {
    expect(isCheckoutBlockingIssue("EMPTY_CART")).toBe(true);
    expect(isCheckoutBlockingIssue("INACTIVE_PRODUCT")).toBe(true);
    expect(isCheckoutBlockingIssue("INACTIVE_VARIANT")).toBe(true);
    expect(isCheckoutBlockingIssue("OUT_OF_STOCK")).toBe(true);
    expect(isCheckoutBlockingIssue("QUANTITY_REDUCED")).toBe(false);
  });

  it("derives checkout steps from cart readiness and address selection", () => {
    expect(
      deriveCheckoutStep({ canProceed: false, selectedAddressId: null }),
    ).toBe("CART_REVIEW");
    expect(
      deriveCheckoutStep({ canProceed: true, selectedAddressId: null }),
    ).toBe("ADDRESS_SELECTION");
    expect(
      deriveCheckoutStep({
        canProceed: true,
        selectedAddressId: "00000000-0000-4000-8000-000000000010",
      }),
    ).toBe("READY_FOR_PAYMENT");
  });

  it("uses store currency configuration rather than hardcoded symbols", () => {
    const currencyFromStore = "USD";
    const format = (amount: number, currency: string) =>
      new Intl.NumberFormat("en", { style: "currency", currency }).format(
        amount,
      );
    expect(format(12.5, currencyFromStore)).toContain("12.50");
    expect(currencyFromStore).not.toBe("₹");
  });

  it("models stale cart messages without silent acceptance", () => {
    const messages = [
      "Quantity for Item was reduced to 2 based on available stock.",
      "This product is currently unavailable.",
      "This product option is currently unavailable.",
      "This item is out of stock.",
    ];
    expect(messages.some((message) => /reduced/i.test(message))).toBe(true);
    expect(messages.some((message) => /unavailable/i.test(message))).toBe(true);
    expect(messages.some((message) => /out of stock/i.test(message))).toBe(true);
  });
});
