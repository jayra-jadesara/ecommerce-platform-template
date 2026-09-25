import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryClient } from "@tanstack/react-query";
import {
  cartCountQueryKey,
  cartQueryKey,
} from "@/features/cart/query-keys";
import { invalidateCartQueryCaches } from "@/features/cart/sync-cart-query";
import {
  wishlistMembershipKey,
  wishlistMembershipQueryKey,
  wishlistQueryKey,
} from "@/features/wishlist/query-keys";
import { syncWishlistQueryCaches } from "@/features/wishlist/sync-wishlist-query";
import type { WishlistView } from "@/features/wishlist/types";

const root = process.cwd();

function readSrc(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("phase 30 cart invalidate exactness", () => {
  it("invalidateCartQueryCaches uses exact keys for cart and count", () => {
    const source = readSrc("src/features/cart/sync-cart-query.ts");
    expect(source).toContain("queryKey: cartQueryKey, exact: true");
    expect(source).toContain("queryKey: cartCountQueryKey");
    expect(source).toContain("exact: true");
  });

  it("does not prefix-invalidate cart after sync on product surfaces", () => {
    const files = [
      "src/features/catalog/components/ProductCard.tsx",
      "src/features/cart/components/ProductPurchaseActions.tsx",
      "src/features/catalog/components/QuickView.tsx",
      "src/features/wishlist/components/WishlistPageClient.tsx",
    ];
    for (const file of files) {
      const source = readSrc(file);
      expect(source).toContain("syncCartQueryCaches");
      expect(source).not.toMatch(
        /invalidateQueries\(\s*\{\s*queryKey:\s*cartQueryKey\s*\}\s*\)/,
      );
    }
  });

  it("runtime invalidate uses exact matching so count is not pulled by cart prefix", async () => {
    const client = new QueryClient();
    let cartInvalidated = false;
    let countInvalidated = false;
    const original = client.invalidateQueries.bind(client);
    client.invalidateQueries = async (filters, options) => {
      if (
        filters &&
        "queryKey" in filters &&
        Array.isArray(filters.queryKey) &&
        filters.queryKey[0] === "cart"
      ) {
        expect(filters.exact).toBe(true);
        if (filters.queryKey.length === 1) cartInvalidated = true;
        if (filters.queryKey[1] === "count") countInvalidated = true;
      }
      return original(filters, options);
    };
    invalidateCartQueryCaches(client);
    expect(cartInvalidated).toBe(true);
    expect(countInvalidated).toBe(true);
    expect(cartQueryKey).toEqual(["cart"]);
    expect(cartCountQueryKey).toEqual(["cart", "count"]);
  });
});

describe("phase 30 wishlist setQueryData sync", () => {
  it("syncWishlistQueryCaches writes list and membership keys", () => {
    const client = new QueryClient();
    const wishlist: WishlistView = {
      id: "w1",
      storeId: "s1",
      currency: "INR",
      items: [
        {
          id: "i1",
          productId: "p1",
          variantId: "v1",
          productName: "Tea",
          productSlug: "tea",
          variantName: null,
          unitPrice: 100,
          imageUrl: null,
          imageAlt: "Tea",
          stockStatus: "IN_STOCK",
          canAddToCart: true,
        },
      ],
    };
    syncWishlistQueryCaches(client, wishlist);
    expect(client.getQueryData(wishlistQueryKey)).toEqual(wishlist);
    expect(client.getQueryData(wishlistMembershipQueryKey)).toEqual([
      wishlistMembershipKey("p1", "v1"),
    ]);
  });

  it("toggle surfaces sync wishlist caches instead of double invalidate", () => {
    const files = [
      "src/features/catalog/components/ProductCard.tsx",
      "src/features/cart/components/ProductPurchaseActions.tsx",
      "src/features/catalog/components/ProductWishlistButton.tsx",
    ];
    for (const file of files) {
      const source = readSrc(file);
      expect(source).toContain("syncWishlistQueryCaches");
      expect(source).not.toContain(
        "invalidateQueries({\n        queryKey: wishlistMembershipQueryKey",
      );
      expect(source).not.toMatch(
        /invalidateQueries\(\s*\{\s*queryKey:\s*wishlistQueryKey\s*\}\s*\)/,
      );
    }
  });
});

describe("phase 30 QueryProvider defaults and cancel", () => {
  it("sets refetchOnMount and refetchOnReconnect false", () => {
    const source = readSrc("src/providers/QueryProvider.tsx");
    expect(source).toContain("refetchOnMount: false");
    expect(source).toContain("refetchOnReconnect: false");
    expect(source).toContain("refetchOnWindowFocus: false");
  });

  it("cancels chrome queries on pathname change", () => {
    const source = readSrc("src/providers/QueryProvider.tsx");
    expect(source).toContain("usePathname");
    expect(source).toContain("cancelQueries");
    expect(source).toContain("wishlistMembershipQueryKey");
    expect(source).toContain("free-shipping-hint");
  });

  it("ProductCard membership query opts out of remount refetch", () => {
    const source = readSrc("src/features/catalog/components/ProductCard.tsx");
    expect(source).toContain("refetchOnMount: false");
  });
});
