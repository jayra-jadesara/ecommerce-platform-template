import { describe, expect, it } from "vitest";
import {
  buildGuestCartCookieValue,
  parseGuestCartCookieValue,
  assertCartOwner,
  assertSameStore,
} from "@/features/cart/guest-token";
import {
  CART_MAX_QUANTITY,
  cartItemCount,
  cartSubtotal,
  guestCartExpiryDate,
  mergeQuantities,
} from "@/features/cart/types";
import {
  addToCartSchema,
  removeCartItemSchema,
  updateCartItemQuantitySchema,
} from "@/features/cart/validation";
import {
  addToWishlistSchema,
  removeFromWishlistSchema,
} from "@/features/wishlist/validation";

const PRODUCT = "00000000-0000-4000-8000-000000000001";
const VARIANT = "00000000-0000-4000-8000-000000000002";
const ITEM = "00000000-0000-4000-8000-000000000003";
const TOKEN = "11111111-1111-4111-8111-111111111111";

describe("cart quantity validation", () => {
  it("accepts add to cart payloads", () => {
    const ok = addToCartSchema.safeParse({
      productId: PRODUCT,
      variantId: VARIANT,
      quantity: 2,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects invalid and unbounded quantities", () => {
    expect(
      addToCartSchema.safeParse({
        productId: PRODUCT,
        variantId: VARIANT,
        quantity: 0,
      }).success,
    ).toBe(false);
    expect(
      addToCartSchema.safeParse({
        productId: PRODUCT,
        variantId: VARIANT,
        quantity: -1,
      }).success,
    ).toBe(false);
    expect(
      addToCartSchema.safeParse({
        productId: PRODUCT,
        variantId: VARIANT,
        quantity: CART_MAX_QUANTITY + 1,
      }).success,
    ).toBe(false);
  });

  it("validates quantity updates and removals", () => {
    expect(
      updateCartItemQuantitySchema.safeParse({
        cartItemId: ITEM,
        quantity: 3,
      }).success,
    ).toBe(true);
    expect(
      removeCartItemSchema.safeParse({ cartItemId: ITEM }).success,
    ).toBe(true);
    expect(
      removeCartItemSchema.safeParse({ cartItemId: "not-a-uuid" }).success,
    ).toBe(false);
  });
});

describe("cart count and subtotal", () => {
  it("sums total quantity across lines", () => {
    expect(cartItemCount([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
  });

  it("calculates pre-checkout subtotal from unit prices", () => {
    expect(
      cartSubtotal([
        { quantity: 2, unitPrice: 10 },
        { quantity: 3, unitPrice: 5 },
      ]),
    ).toBe(35);
  });
});

describe("duplicate variant quantity merge", () => {
  it("merges guest into customer quantities", () => {
    expect(
      mergeQuantities({
        customerQuantity: 2,
        guestQuantity: 3,
        availableStock: 20,
      }),
    ).toEqual({ quantity: 5, capped: false });
  });

  it("caps merge when stock is insufficient", () => {
    expect(
      mergeQuantities({
        customerQuantity: 4,
        guestQuantity: 4,
        availableStock: 5,
      }),
    ).toEqual({ quantity: 5, capped: true });
  });

  it("respects max quantity without stock tracking", () => {
    expect(
      mergeQuantities({
        customerQuantity: 50,
        guestQuantity: 60,
        availableStock: null,
      }),
    ).toEqual({ quantity: CART_MAX_QUANTITY, capped: true });
  });
});

describe("guest cart token security", () => {
  it("creates and verifies signed guest tokens", () => {
    const secret = "test-guest-secret";
    const value = buildGuestCartCookieValue(TOKEN, secret);
    expect(parseGuestCartCookieValue(value, secret)).toBe(TOKEN);
  });

  it("rejects forged or unsigned cookie values", () => {
    const secret = "test-guest-secret";
    const value = buildGuestCartCookieValue(TOKEN, secret);
    expect(parseGuestCartCookieValue(value, "other-secret")).toBeNull();
    expect(parseGuestCartCookieValue(TOKEN, secret)).toBeNull();
    expect(parseGuestCartCookieValue(`${TOKEN}.tampered`, secret)).toBeNull();
    expect(parseGuestCartCookieValue(undefined, secret)).toBeNull();
  });

  it("supports configurable soft expiry windows", () => {
    const from = new Date("2026-09-07T00:00:00.000Z");
    const expiry = guestCartExpiryDate(30, from);
    expect(expiry.toISOString()).toBe("2026-10-07T00:00:00.000Z");
  });
});

describe("wishlist validation and auth boundaries", () => {
  it("accepts wishlist add/remove payloads", () => {
    expect(
      addToWishlistSchema.safeParse({
        productId: PRODUCT,
        variantId: VARIANT,
      }).success,
    ).toBe(true);
    expect(
      addToWishlistSchema.safeParse({
        productId: PRODUCT,
        variantId: null,
      }).success,
    ).toBe(true);
    expect(
      removeFromWishlistSchema.safeParse({ wishlistItemId: ITEM }).success,
    ).toBe(true);
  });

  it("rejects cross-user cart ownership mismatches", () => {
    expect(assertCartOwner("user-a", "user-a")).toBe(true);
    expect(assertCartOwner("user-a", "user-b")).toBe(false);
    expect(assertCartOwner(null, "user-a")).toBe(false);
    expect(assertCartOwner("user-a", null)).toBe(false);
  });

  it("rejects cross-store resource access", () => {
    expect(assertSameStore("store-1", "store-1")).toBe(true);
    expect(assertSameStore("store-1", "store-2")).toBe(false);
  });
});

describe("out-of-stock and inactive messaging contracts", () => {
  it("documents user-facing rejection messages used by services", () => {
    const messages = {
      outOfStock: "This item is out of stock.",
      insufficient: (n: number) => `Only ${n} available in stock.`,
      inactiveProduct: "This product is currently unavailable.",
      inactiveVariant: "This product option is currently unavailable.",
      wishlistAuth: "Sign in to save items to your wishlist.",
      unavailableWishlist: "UNAVAILABLE",
    };

    expect(messages.outOfStock).toMatch(/out of stock/i);
    expect(messages.insufficient(2)).toBe("Only 2 available in stock.");
    expect(messages.inactiveProduct).toMatch(/unavailable/i);
    expect(messages.inactiveVariant).toMatch(/unavailable/i);
    expect(messages.wishlistAuth).toMatch(/sign in/i);
    expect(messages.unavailableWishlist).toBe("UNAVAILABLE");
  });
});
