import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("hydration safety", () => {
  it("defers Framer Motion until after hydration", () => {
    const src = readSrc("src/features/animation/Motion.tsx");
    expect(src).toContain("useHasHydrated");
    expect(src).toMatch(/if \(!hydrated/);
  });

  it("keeps fallback homepage as a Server Component", () => {
    const src = readSrc("src/app/(storefront)/home-view.tsx");
    expect(src).not.toMatch(/^["']use client["']/m);
    expect(src).not.toContain("sf-band-soft");
    expect(src).not.toContain("Quality first");
  });

  it("mounts Quick View only when opened", () => {
    const src = readSrc("src/features/catalog/components/ProductCard.tsx");
    expect(src).toContain("quickOpen ?");
    expect(src).toContain("<QuickView");
  });
});
