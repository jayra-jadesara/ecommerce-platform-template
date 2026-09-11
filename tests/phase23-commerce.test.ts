import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("phase 23 commerce redesign", () => {
  it("ships Quick View reusing cart add action", () => {
    const quick = readSrc("src/features/catalog/components/QuickView.tsx");
    const card = readSrc("src/features/catalog/components/ProductCard.tsx");
    expect(quick).toContain("addToCartAction");
    expect(quick).toContain("getProductQuickViewAction");
    expect(quick).toContain("View full details");
    expect(card).toContain("QuickView");
    expect(card).toContain("Quick view");
  });

  it("exposes variant options on product cards", () => {
    const storefront = readSrc("src/features/catalog/storefront.ts");
    const card = readSrc("src/features/catalog/components/ProductCard.tsx");
    expect(storefront).toContain("variantOptions");
    expect(card).toContain("variantOptions");
    expect(card).toContain("selectedVariantId");
  });

  it("provides collection filters inlined in ProductsCatalog", () => {
    const catalog = readSrc(
      "src/features/catalog/components/ProductsCatalog.tsx",
    );
    const products = readSrc("src/app/(storefront)/products/page.tsx");
    expect(products).toContain("ProductsCatalog");
    expect(catalog).toContain('aria-label="Product filters"');
    expect(catalog).toContain("Show filter");
    expect(catalog).toContain('id="catalog-sort"');
    expect(catalog).toContain("resetFilters");
  });

  it("wires free-shipping progress into cart surfaces", () => {
    const drawer = readSrc("src/features/cart/components/HeaderCartControl.tsx");
    const cart = readSrc("src/features/cart/components/CartPageClient.tsx");
    const progress = readSrc(
      "src/features/cart/components/FreeShippingProgress.tsx",
    );
    expect(progress).toContain("Free delivery unlocked");
    expect(progress).not.toContain("750");
    expect(drawer).toContain("FreeShippingProgressLoader");
    expect(cart).toContain("FreeShippingProgressLoader");
  });

  it("improves PDP buy UX without exposing raw inventory counts", () => {
    const pdp = readSrc("src/features/catalog/components/ProductDetailClient.tsx");
    const purchase = readSrc(
      "src/features/cart/components/ProductPurchaseActions.tsx",
    );
    expect(pdp).toContain("DeliveryInfoBlock");
    expect(pdp).toContain("Limited stock");
    expect(pdp).not.toContain("SKU {selected.sku}");
    expect(purchase).toContain("Buy it now");
    expect(purchase).toContain("/checkout");
    expect(purchase).not.toMatch(/in stock:\s*\{/i);
    expect(purchase).not.toContain("inventoryQuantity");
  });

  it("redesigns contact from configured store data only", () => {
    const contact = readSrc("src/app/(storefront)/contact/page.tsx");
    expect(contact).toContain("getPlatformConfigAsync");
    expect(contact).toContain("social");
    expect(contact).not.toContain("vasantmasala");
    expect(contact).not.toContain("priyafoods");
  });

  it("does not hardcode trust claims on fallback homepage", () => {
    const home = readSrc("src/app/(storefront)/home-view.tsx");
    expect(home).not.toContain("Quality first");
    expect(home).not.toContain("Flavour that lasts");
    expect(home).not.toContain("Bring authentic flavour home");
    expect(home).not.toContain("Crafted for flavour");
  });
});
