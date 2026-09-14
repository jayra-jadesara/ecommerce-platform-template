import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cartCountQueryKey,
  cartQueryKey,
} from "@/features/cart/query-keys";
import { cartItemCount } from "@/features/cart/types";
import { resolveOptimizedStorageUrl } from "@/lib/supabase/storage-url";

describe("phase 29 cart count architecture", () => {
  it("exposes a distinct count query key under the cart prefix", () => {
    expect(cartCountQueryKey[0]).toBe("cart");
    expect(cartCountQueryKey).not.toEqual(cartQueryKey);
    expect(cartCountQueryKey).toEqual(["cart", "count"]);
  });

  it("derives badge totals from quantities without needing line payloads", () => {
    expect(cartItemCount([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
  });

  it("HeaderCartControl hydrates badge from SSR and skips mount refetch", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/features/cart/components/HeaderCartControl.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("initialCartCount");
    expect(source).toContain("getCartCountAction");
    expect(source).toContain("cartCountQueryKey");
    expect(source).toContain("initialData: initialCartCount");
    expect(source).toContain("refetchOnMount: false");
    expect(source).toContain("enabled: loadFullCart");
  });

  it("storefront layout streams cart count via Suspense (does not block shell)", () => {
    const layout = readFileSync(
      join(process.cwd(), "src/app/(storefront)/layout.tsx"),
      "utf8",
    );
    expect(layout).toContain("Suspense");
    expect(layout).toContain("HeaderCartBadge");
    expect(layout).toContain("HeaderCartControlFallback");
    expect(layout).toContain("getPlatformConfigAsync");
    expect(layout).not.toMatch(/Promise\.all\(\[\s*getPlatformConfigAsync/);
    // Fallback must not mount HeaderCartControl (would seed RQ cache with 0).
    expect(layout).not.toMatch(
      /fallback=\{<\s*HeaderCartControl\b/,
    );
  });

  it("getCartItemCount is request-memoized with React cache()", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/cart/service.ts"),
      "utf8",
    );
    expect(source).toContain('import { cache } from "react"');
    expect(source).toContain("export const getCartItemCount = cache");
  });

  it("next.config allows image quality 70", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain("qualities: [70, 75]");
  });

  it("cart service exports a count path that does not merge guest carts", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/cart/service.ts"),
      "utf8",
    );
    const start = source.indexOf("export const getCartItemCount = cache");
    const end = source.indexOf("async function upsertCartItemQuantity");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const countFn = source.slice(start, end);
    expect(countFn).toContain('select("quantity")');
    expect(countFn).not.toContain("mergeGuestCartIntoCustomer");
    expect(countFn).not.toContain("fetchCartItems");
  });
});

describe("phase 29 request memoization markers", () => {
  it("wraps auth loaders with React cache()", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/auth/session.ts"),
      "utf8",
    );
    expect(source).toContain('import { cache } from "react"');
    expect(source).toContain("export const getCurrentUser = cache");
    expect(source).toContain("export const getCurrentAdmin = cache");
    expect(source).toContain("getAuthSessionUser");
  });

  it("request-memoizes platform config", () => {
    const source = readFileSync(
      join(process.cwd(), "src/config/site.server.ts"),
      "utf8",
    );
    expect(source).toContain('import { cache } from "react"');
    expect(source).toContain("export const getPlatformConfigAsync = cache");
  });

  it("request-memoizes product-by-slug", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/catalog/storefront.ts"),
      "utf8",
    );
    expect(source).toContain(
      "export const getStorefrontProductBySlug = cache",
    );
  });
});

describe("phase 29 query / image / isolation guards", () => {
  it("batches customer order list payments and item counts", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/orders/queries.ts"),
      "utf8",
    );
    expect(source).toContain('.in("order_id", orderIds)');
    expect(source).toContain("itemCountByOrder");
    expect(source).toContain("paymentByOrder");
  });

  it("batches order detail product images", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/orders/queries.ts"),
      "utf8",
    );
    const mapItems = source.slice(
      source.indexOf("async function mapItems"),
      source.indexOf("async function mapPayment"),
    );
    expect(mapItems).toContain('.in("product_id", productIds)');
    expect(mapItems).not.toMatch(/for \(const item of items[\s\S]*product_images/);
  });

  it("caps in-memory price sort fetches", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/catalog/storefront.ts"),
      "utf8",
    );
    expect(source).toContain("PRICE_SORT_FETCH_CAP");
    expect(source).toContain(".limit(PRICE_SORT_FETCH_CAP)");
  });

  it("builds optimized storage URLs when transforms are enabled", () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM;
    const urlPrev = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM = "true";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    try {
      const url = resolveOptimizedStorageUrl("products", "store/a.jpg", {
        width: 480,
        quality: 75,
      });
      expect(url).toContain("/storage/v1/render/image/public/products/");
      expect(url).toContain("width=480");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM;
      else process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM = prev;
      if (urlPrev === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = urlPrev;
    }
  });

  it("keeps Three.js product viewer dynamically imported", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/features/catalog/components/ProductDetailClient.tsx",
      ),
      "utf8",
    );
    expect(source).toContain('import("@/components/three/Product3DViewer")');
    expect(source).not.toContain('from "@/components/three"');
  });

  it("does not mount AdminShell from AppProviders", () => {
    const source = readFileSync(
      join(process.cwd(), "src/providers/AppProviders.tsx"),
      "utf8",
    );
    expect(source).not.toContain("AdminShell");
    expect(source).not.toContain("@/features/admin");
  });

  it("lazily loads jspdf receipt helper from account payments list", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/features/payments/components/AccountPaymentsList.tsx",
      ),
      "utf8",
    );
    expect(source).toContain(
      "@/features/payments/download-order-receipt-pdf",
    );
    expect(source).toContain("await import(");
    expect(source).not.toMatch(
      /import\s+\{\s*downloadOrderReceiptPdf\s*\}\s+from/,
    );
  });

  it("dev timing helper is silent outside development", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const { measureServerOperation } = await import(
        "@/lib/perf/measure-server"
      );
      const value = await measureServerOperation("test.op", async () => 42);
      expect(value).toBe(42);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
