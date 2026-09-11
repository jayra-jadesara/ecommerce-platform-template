import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("storefront UX polish", () => {
  it("keeps header opaque with centered nav and icon utilities", () => {
    const src = readSrc("src/components/layout/Header.tsx");
    expect(src).toContain('bg-[var(--color-header-background)]');
    expect(src).not.toContain("bg-[var(--color-header-background)]/90");
    expect(src).toContain("isolate z-50");
    expect(src).toContain("usePathname");
    expect(src).toContain("searchOpen");
    expect(src).toContain("-translate-x-1/2");
  });

  it("uses image-dominant product cards in a fluid grid", () => {
    const src = readSrc("src/features/catalog/components/ProductCard.tsx");
    expect(src).toContain("aspect-[4/5]");
    expect(src).toContain("object-contain");
    expect(src).toContain("sf-product-tile");
    expect(src).toContain("Quick view");
  });

  it("separates main content from the sticky navbar and exposes BackLink", () => {
    const shell = readSrc("src/components/layout/PageShell.tsx");
    const back = readSrc("src/components/layout/BackLink.tsx");
    const products = readSrc("src/app/(storefront)/products/page.tsx");
    const catalog = readSrc("src/features/catalog/components/ProductsCatalog.tsx");
    expect(shell).toContain("pt-8");
    expect(shell).toContain("md:pt-10");
    expect(back).toContain("rounded-full");
    expect(back).toContain("router.back");
    expect(products).toContain("ProductsCatalog");
    expect(catalog).toContain("grid-cols-2");
  });
});
