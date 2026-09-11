import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("food-brand storefront redesign", () => {
  it("uses warm spice defaults without hardcoding a client brand", () => {
    const defaults = readSrc("src/config/defaults.ts");
    const tokens = readSrc("src/styles/tokens.css");
    expect(defaults).toContain("#9f1239");
    expect(defaults).toContain("#fff8f0");
    expect(tokens).toContain("--color-primary: #9f1239");
    expect(defaults.toLowerCase()).not.toContain("sonet");
    expect(tokens.toLowerCase()).not.toContain("sonet");
  });

  it("ships a full-bleed home composition with collections and bestsellers", () => {
    const home = readSrc("src/app/(storefront)/home-view.tsx");
    const page = readSrc("src/app/(storefront)/page.tsx");
    expect(home).toContain("productHeroImages");
    expect(home).toContain("Explore our Collections");
    expect(home).toContain("Featured products");
    expect(home).toContain("ProductCard");
    expect(home).not.toContain("Bring authentic flavour home");
    expect(home).not.toContain("Crafted for flavour");
    expect(page).toContain("listStorefrontProducts");
    expect(page).toContain("listStorefrontCategories");
    expect(page).toContain("constrained={false}");
  });

  it("styles primary CTAs with brand primary; footer CTA is brand-driven", () => {
    const btn = readSrc("src/components/ui/storefront-classes.ts");
    const footer = readSrc("src/components/layout/Footer.tsx");
    expect(btn).toContain("bg-[var(--color-primary)]");
    expect(footer).not.toContain("Bring authentic flavour home");
    expect(footer).toContain("ctaLine");
    expect(footer).toContain("Shop now");
  });
});
