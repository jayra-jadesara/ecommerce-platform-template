import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HERO_LAYOUT_PRESETS,
  HERO_LAYOUT_PRESET_LABELS,
  defaultConfigForType,
  parseSectionConfig,
} from "@/features/cms/schemas";
import { sfBtn, sfSectionInner } from "@/components/ui/storefront-classes";
import { defaultPlatformConfig } from "@/config/defaults";

const root = process.cwd();

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("phase 21 — design system tokens", () => {
  it("exposes storefront button variants without hard-coded brand hex", () => {
    for (const variant of ["primary", "secondary", "ghost", "outline", "danger"] as const) {
      const cls = sfBtn(variant);
      expect(cls).toContain("var(--color-");
      expect(cls).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
    expect(sfSectionInner()).toContain("--layout-content-max");
  });

  it("uses constrained content max width in tokens", () => {
    const tokens = readSrc("src/styles/tokens.css");
    expect(tokens).toContain("--layout-content-max");
    expect(tokens).toMatch(/--layout-content-max:\s*1520px/);
  });
});

describe("phase 21 — hero layout presets", () => {
  it("only allows safe hero layout presets", () => {
    expect(HERO_LAYOUT_PRESETS).toEqual([
      "SPLIT",
      "CENTERED",
      "FULL_BLEED",
      "IMAGE_RIGHT",
      "IMAGE_LEFT",
    ]);
    for (const preset of HERO_LAYOUT_PRESETS) {
      expect(HERO_LAYOUT_PRESET_LABELS[preset]).toBeTruthy();
    }
  });

  it("defaults hero config with layoutPreset SPLIT", () => {
    const cfg = defaultConfigForType("hero");
    expect(cfg).toMatchObject({ layoutPreset: "SPLIT" });
  });

  it("rejects arbitrary layout strings", () => {
    const parsed = parseSectionConfig("hero", {
      title: "Hello",
      layoutPreset: "CUSTOM_CSS_INJECTION",
    });
    expect(parsed.ok).toBe(false);
  });

  it("SectionRenderer implements layout presets", () => {
    const src = readSrc("src/features/cms/components/SectionRenderer.tsx");
    expect(src).toContain("layoutPreset");
    expect(src).toContain("FULL_BLEED");
    expect(src).toContain("IMAGE_LEFT");
    expect(src).toContain("themeHeroBackdrop");
  });
});

describe("phase 21 — storefront chrome", () => {
  it("header includes search, wishlist, cart, and scroll affordance", () => {
    const src = readSrc("src/components/layout/Header.tsx");
    expect(src).toContain("Search products");
    expect(src).toContain("/account/wishlist");
    expect(src).toContain("HeaderCartControl");
    expect(src).toContain("scrolled");
    expect(src).toContain("sticky");
  });

  it("footer is multi-column and hides empty contact/social", () => {
    const src = readSrc("src/components/layout/Footer.tsx");
    expect(src).toContain("Shop");
    expect(src).toContain("Support");
    expect(src).toContain("hasContact");
    expect(src).toContain("socialLinks.length");
    expect(src).not.toContain("Secure shopping · Quality products");
  });

  it("announcement bar uses theme tokens", () => {
    const src = readSrc("src/components/layout/AnnouncementBar.tsx");
    expect(src).toContain("var(--color-button-background)");
    expect(src).not.toMatch(/bg-\[#(0-9a-fA-F)/);
  });
});

describe("phase 21 — product card & empty states", () => {
  it("product card uses theme tokens and hover treatments", () => {
    const src = readSrc("src/features/catalog/components/ProductCard.tsx");
    const css = readSrc("src/styles/storefront.css");
    expect(src).toContain("secondaryImageUrl");
    expect(src).toContain("compareAtPrice");
    expect(src).toContain("sf-product-tile-image");
    expect(src).toContain("sfBtn");
    expect(css).toContain(".sf-product-tile:hover");
    expect(css).toContain("--motion-image-scale");
    expect(src).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("empty state is polished and CTA-ready", () => {
    const src = readSrc("src/components/ui/EmptyState.tsx");
    expect(src).toContain("radial-gradient");
    expect(src).toContain("emptyStateCtaClass");
    expect(src).not.toContain("border-dashed");
  });

  it("cart drawer supports quantity, remove, and checkout CTA", () => {
    const src = readSrc("src/features/cart/components/HeaderCartControl.tsx");
    expect(src).toContain("removeFromCartAction");
    expect(src).toContain("updateCartItemQuantityAction");
    // Platform commerce CTA is intentionally "Buy it now" → /checkout.
    expect(src).toContain("Buy it now");
    expect(src).toContain('href="/checkout"');
    expect(src).toContain("Your cart is empty");
  });
});

describe("phase 21 — admin preview realism", () => {
  it("preview mirrors product-first storefront chrome without weak tagline fallbacks", () => {
    const src = readSrc(
      "src/features/admin/theme/components/ThemeEditorPreviewCanvas.tsx",
    );
    expect(src).not.toContain("Sample product");
    expect(src).not.toContain("Free shipping on qualifying orders");
    expect(src).toContain("Example Product");
    expect(src).toContain("Shop Now");
    expect(src).toContain("Shop by category");
    expect(src).toContain("lifestyleImage");
    expect(src).toContain("Category one");
    expect(src).toContain("repeat(3, minmax(0, 1fr))");
    // Logo must not be used as full-bleed hero cover
    expect(src).toContain("Never stretches the logo");
    expect(src).toContain("socialImageUrl");
  });

  it("does not hardcode client brand names in reusable UI", () => {
    const files = [
      "src/components/layout/Header.tsx",
      "src/components/layout/Footer.tsx",
      "src/features/catalog/components/ProductCard.tsx",
      "src/features/cms/components/SectionRenderer.tsx",
      "src/app/(storefront)/home-view.tsx",
    ];
    for (const file of files) {
      const src = readSrc(file);
      expect(src.toLowerCase()).not.toContain("sonet");
      expect(src).not.toMatch(/bg-\[#(?:6366f1|7c3aed|8b5cf6)/i);
    }
  });
});

describe("phase 21 — theme compatibility defaults", () => {
  it("keeps light and dark semantic tokens in default config", () => {
    expect(defaultPlatformConfig.theme.light.primary).toBeTruthy();
    expect(defaultPlatformConfig.theme.dark.primary).toBeTruthy();
    expect(defaultPlatformConfig.theme.light.primary).not.toBe(
      defaultPlatformConfig.theme.dark.primary,
    );
  });

  it("homepage builder exposes layoutPreset control", () => {
    const src = readSrc("src/features/cms/components/HomepageBuilder.tsx");
    expect(src).toContain("layoutPreset");
    expect(src).toContain("HERO_LAYOUT_PRESETS");
  });

  it("order timeline uses real statuses only", () => {
    const src = readSrc(
      "src/features/orders/components/OrderStatusTimeline.tsx",
    );
    expect(src).toContain("Payment confirmed");
    expect(src).toContain("CANCELLED");
    expect(src).not.toContain("Out for delivery tomorrow");
  });
});
