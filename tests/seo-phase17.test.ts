import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  isSafePublicAssetUrl,
  resolveTrustedSiteUrl,
  validateSiteUrl,
} from "@/lib/site-url";
import {
  resolveCategorySeo,
  resolveCmsPageSeo,
  resolveProductSeo,
  resolveProductsListingSeo,
  resolveStoreHomepageSeo,
} from "@/features/seo/resolve";
import {
  buildProductJsonLd,
  buildRobotsDisallowPaths,
  schemaAvailability,
  serializeJsonLd,
  shouldIncludeInSitemap,
} from "@/features/seo";
import { buildPageMetadata } from "@/lib/metadata";
import { defaultPlatformConfig } from "@/config/defaults";
import { hasPermission } from "@/features/auth/permissions";
import { isSafeHttpUrl } from "@/features/admin/settings/validation";

const baseSeo = defaultPlatformConfig.seo;

describe("site URL / white-label domain", () => {
  it("validates configured site URLs", () => {
    expect(validateSiteUrl("https://client-a.com")).toBe("https://client-a.com");
    expect(validateSiteUrl("https://client-b.com/")).toBe("https://client-b.com");
    expect(validateSiteUrl("javascript:alert(1)")).toBeNull();
    expect(validateSiteUrl("data:text/html,hi")).toBeNull();
  });

  it("builds absolute URLs from trusted origin", () => {
    expect(absoluteUrl("/products/x", "https://client-a.com")).toBe(
      "https://client-a.com/products/x",
    );
  });

  it("falls back to localhost when env missing", () => {
    expect(resolveTrustedSiteUrl(undefined)).toBe("http://localhost:3000");
  });

  it("rejects unsafe public asset URLs", () => {
    expect(isSafePublicAssetUrl("javascript:alert(1)")).toBe(false);
    expect(isSafePublicAssetUrl("https://cdn.example/a.jpg")).toBe(true);
    expect(isSafePublicAssetUrl("/relative/path.png")).toBe(true);
  });
});

describe("store / product / category / page metadata", () => {
  it("uses store SEO with brand fallback for homepage", () => {
    const resolved = resolveStoreHomepageSeo({
      seo: { ...baseSeo, title: "", description: "" },
      brandName: "Acme Store",
    });
    expect(resolved.title).toBe("Acme Store");
    expect(resolved.canonicalPath).toBe("/");
  });

  it("resolves product metadata priority", () => {
    const resolved = resolveProductSeo({
      product: {
        name: "Garam Masala",
        slug: "garam-masala",
        seoTitle: "Buy Garam Masala",
        seoDescription: null,
        shortDescription: "Aromatic blend",
        primaryImageUrl: "https://cdn.example/p.jpg",
      },
      seo: baseSeo,
      brandName: "Acme",
    });
    expect(resolved.title).toBe("Buy Garam Masala");
    expect(resolved.description).toBe("Aromatic blend");
    expect(resolved.ogImage).toBe("https://cdn.example/p.jpg");
    expect(resolved.ogType).toBe("product");
    expect(resolved.canonicalPath).toBe("/products/garam-masala");
  });

  it("falls back product description to store SEO", () => {
    const resolved = resolveProductSeo({
      product: {
        name: "Tea",
        slug: "tea",
        seoTitle: null,
        seoDescription: null,
        shortDescription: null,
      },
      seo: { ...baseSeo, description: "Store wide description" },
    });
    expect(resolved.description).toBe("Store wide description");
    expect(resolved.title).toBe("Tea");
  });

  it("resolves category metadata", () => {
    const resolved = resolveCategorySeo({
      category: {
        name: "Spices",
        slug: "spices",
        description: "Whole spices",
        seoTitle: null,
        seoDescription: null,
      },
      seo: baseSeo,
    });
    expect(resolved.title).toBe("Spices");
    expect(resolved.description).toBe("Whole spices");
    expect(resolved.canonicalPath).toBe("/categories/spices");
  });

  it("noindexes unpublished CMS pages", () => {
    const draft = resolveCmsPageSeo({
      page: {
        title: "About",
        slug: "about",
        status: "draft",
        seoTitle: "About us",
        seoDescription: "Story",
      },
      seo: baseSeo,
    });
    expect(draft.robotsIndex).toBe(false);

    const published = resolveCmsPageSeo({
      page: {
        title: "About",
        slug: "about",
        status: "published",
        seoTitle: "About us",
        seoDescription: "Story",
      },
      seo: baseSeo,
    });
    expect(published.robotsIndex).toBe(true);
    expect(published.canonicalPath).toBe("/pages/about");
  });

  it("canonicalizes product listing and noindexes deep pages", () => {
    const page1 = resolveProductsListingSeo({ seo: baseSeo, page: 1 });
    expect(page1.canonicalPath).toBe("/products");
    expect(page1.robotsIndex).toBe(true);
    const page2 = resolveProductsListingSeo({ seo: baseSeo, page: 2 });
    expect(page2.canonicalPath).toBe("/products");
    expect(page2.robotsIndex).toBe(false);
  });
});

describe("canonical via buildPageMetadata", () => {
  it("builds canonical from path + trusted site URL", () => {
    const meta = buildPageMetadata({
      title: "Tea",
      description: "Nice tea",
      canonicalPath: "/products/tea",
      seo: baseSeo,
    });
    expect(meta.alternates?.canonical).toMatch(/\/products\/tea$/);
    expect(String(meta.alternates?.canonical)).not.toContain("sonet");
  });
});

describe("sitemap inclusion / exclusion", () => {
  it("includes active products and published pages only", () => {
    expect(
      shouldIncludeInSitemap({ kind: "product", status: "active" }),
    ).toBe(true);
    expect(
      shouldIncludeInSitemap({ kind: "product", status: "archived" }),
    ).toBe(false);
    expect(
      shouldIncludeInSitemap({ kind: "product", status: "draft" }),
    ).toBe(false);
    expect(
      shouldIncludeInSitemap({ kind: "page", status: "published" }),
    ).toBe(true);
    expect(shouldIncludeInSitemap({ kind: "page", status: "draft" })).toBe(
      false,
    );
    expect(
      shouldIncludeInSitemap({ kind: "category", isActive: true }),
    ).toBe(true);
    expect(
      shouldIncludeInSitemap({ kind: "category", isActive: false }),
    ).toBe(false);
    expect(shouldIncludeInSitemap({ kind: "utility" })).toBe(false);
  });
});

describe("robots.txt", () => {
  it("disallows account, cart, checkout, payment, and admin route", () => {
    const paths = buildRobotsDisallowPaths("manage-store");
    expect(paths).toContain("/manage-store/");
    expect(paths).toContain("/account");
    expect(paths).toContain("/cart");
    expect(paths).toContain("/checkout");
    expect(paths).toContain("/payment");
    expect(paths).not.toContain("/admin/");
  });

  it("uses configured admin segment, not hardcoded /admin", () => {
    const paths = buildRobotsDisallowPaths("client-ops");
    expect(paths).toContain("/client-ops/");
    expect(paths).not.toContain("/admin/");
  });
});

describe("product JSON-LD", () => {
  it("includes offer with currency and stock", () => {
    const ld = buildProductJsonLd({
      name: "Tea",
      slug: "tea",
      description: "Green tea",
      brand: "Acme",
      currency: "USD",
      images: [{ url: "https://cdn.example/tea.jpg" }],
      variants: [
        {
          name: "100g",
          sku: "TEA-100",
          price: 9.5,
          stockStatus: "IN_STOCK",
        },
      ],
    });
    expect(ld["@type"]).toBe("Product");
    expect((ld.offers as { priceCurrency: string }).priceCurrency).toBe("USD");
    expect((ld.offers as { price: string }).price).toBe("9.50");
    expect((ld.offers as { availability: string }).availability).toBe(
      schemaAvailability("IN_STOCK"),
    );
    expect(JSON.stringify(ld)).not.toContain("INR");
  });

  it("uses AggregateOffer when variant prices differ", () => {
    const ld = buildProductJsonLd({
      name: "Pack",
      slug: "pack",
      currency: "EUR",
      images: [],
      variants: [
        { name: "S", sku: "P-S", price: 5, stockStatus: "IN_STOCK" },
        { name: "L", sku: "P-L", price: 12, stockStatus: "OUT_OF_STOCK" },
      ],
    });
    const offers = ld.offers as { "@type": string; lowPrice: string; highPrice: string };
    expect(offers["@type"]).toBe("AggregateOffer");
    expect(offers.lowPrice).toBe("5.00");
    expect(offers.highPrice).toBe("12.00");
  });

  it("maps stock availability", () => {
    expect(schemaAvailability("OUT_OF_STOCK")).toContain("OutOfStock");
    expect(schemaAvailability("LOW_STOCK")).toContain("InStock");
  });

  it("safely serializes JSON-LD without executing script breakouts", () => {
    const raw = serializeJsonLd({
      "@type": "Product",
      name: "</script><script>alert(1)</script>",
    });
    expect(raw).toContain("\\u003c");
    expect(raw).not.toContain("</script>");
  });

  it("falls back product image omission when unsafe", () => {
    const ld = buildProductJsonLd({
      name: "X",
      slug: "x",
      currency: "USD",
      images: [{ url: "javascript:alert(1)" }],
      variants: [
        { name: "1", sku: "X1", price: 1, stockStatus: "IN_STOCK" },
      ],
    });
    expect(ld.image).toBeUndefined();
  });
});

describe("unsafe URL rejection", () => {
  it("rejects javascript and data URLs in SEO validation helper", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,hi")).toBe(false);
    expect(isSafeHttpUrl("https://ok.example")).toBe(true);
  });
});

describe("SEO permissions", () => {
  it("allows ADMIN to update SEO and denies ORDER_MANAGER", () => {
    expect(hasPermission(["ADMIN"], "seo.update")).toBe(true);
    expect(hasPermission(["SUPER_ADMIN"], "seo.update")).toBe(true);
    expect(hasPermission(["ORDER_MANAGER"], "seo.update")).toBe(false);
    expect(hasPermission(["EDITOR"], "seo.view")).toBe(true);
  });
});
