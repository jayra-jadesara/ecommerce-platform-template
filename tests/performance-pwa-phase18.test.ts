import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PWA_CACHE_VERSION,
  PWA_OFFLINE_CACHE,
  PWA_STATIC_CACHE,
  buildManifestFields,
  isCacheableStaticAsset,
  isPrivateCachePath,
  normalizeAdminSegment,
  shouldNetworkOnly,
} from "@/features/pwa";
import {
  shouldMountHero3d,
  shouldMountProduct3d,
} from "@/features/visual-effects/decide";
import { DEFAULT_VISUAL_EFFECTS } from "@/features/visual-effects";
import { resolveOptimizedStorageUrl } from "@/lib/supabase/storage-url";

describe("PWA manifest fields (store-driven)", () => {
  it("uses branding name and theme colors", () => {
    const fields = buildManifestFields({
      brandName: "Acme Goods",
      siteName: "Fallback Site",
      description: "Quality goods",
      primaryColor: "#1a5f4a",
      backgroundColor: "#f7f3ee",
      iconUrl: "https://cdn.example/icon.png",
      locale: "en-IN",
    });
    expect(fields.name).toBe("Acme Goods");
    expect(fields.short_name).toBe("Acme Goods");
    expect(fields.theme_color).toBe("#1a5f4a");
    expect(fields.background_color).toBe("#f7f3ee");
    expect(fields.start_url).toBe("/");
    expect(fields.display).toBe("standalone");
    expect(fields.iconSrc).toBe("https://cdn.example/icon.png");
    expect(fields.lang).toBe("en");
  });

  it("falls back without hard-coded client brands", () => {
    const fields = buildManifestFields({});
    expect(fields.name).toBe("Store");
    expect(fields.description).toBe("Shop online");
    expect(fields.iconSrc).toBe("/icon.svg");
    expect(JSON.stringify(fields).toLowerCase()).not.toContain("sonet");
  });

  it("truncates long short_name", () => {
    const fields = buildManifestFields({
      brandName: "Very Long Brand Name Here",
    });
    expect(fields.short_name.length).toBeLessThanOrEqual(12);
  });
});

describe("service-worker cache policy", () => {
  it("marks private and admin paths as network-only", () => {
    expect(isPrivateCachePath("/cart")).toBe(true);
    expect(isPrivateCachePath("/checkout")).toBe(true);
    expect(isPrivateCachePath("/account/orders")).toBe(true);
    expect(isPrivateCachePath("/payment/return")).toBe(true);
    expect(isPrivateCachePath("/api/cart")).toBe(true);
    expect(isPrivateCachePath("/manage-store/products")).toBe(true);
    expect(isPrivateCachePath("/manage-store/products", "manage-store")).toBe(
      true,
    );
    expect(isPrivateCachePath("/ops/dashboard", "ops")).toBe(true);
    expect(shouldNetworkOnly("/checkout")).toBe(true);
  });

  it("allows public catalog paths through non-private checks", () => {
    expect(isPrivateCachePath("/")).toBe(false);
    expect(isPrivateCachePath("/products")).toBe(false);
    expect(isPrivateCachePath("/products/tea")).toBe(false);
    expect(isPrivateCachePath("/offline")).toBe(false);
  });

  it("only treats static assets and offline as cacheable helpers", () => {
    expect(isCacheableStaticAsset("/_next/static/chunk.js")).toBe(true);
    expect(isCacheableStaticAsset("/offline")).toBe(true);
    expect(isCacheableStaticAsset("/icon.svg")).toBe(true);
    expect(isCacheableStaticAsset("/cart")).toBe(false);
    expect(isCacheableStaticAsset("/api/orders")).toBe(false);
  });

  it("versions static and offline caches", () => {
    expect(PWA_CACHE_VERSION).toMatch(/^v\d+/);
    expect(PWA_STATIC_CACHE).toContain(PWA_CACHE_VERSION);
    expect(PWA_OFFLINE_CACHE).toContain(PWA_CACHE_VERSION);
  });

  it("normalizes admin segment safely", () => {
    expect(normalizeAdminSegment("")).toBe("manage-store");
    expect(normalizeAdminSegment("/Custom-Admin/")).toBe("custom-admin");
  });
});

describe("public/sw.js cache rules", () => {
  const swSource = readFileSync(
    resolve(process.cwd(), "public/sw.js"),
    "utf8",
  );

  it("never caches listed private prefixes", () => {
    for (const prefix of [
      "/account",
      "/cart",
      "/checkout",
      "/payment",
      "/api/",
    ]) {
      expect(swSource).toContain(`"${prefix}"`);
    }
    expect(swSource).toMatch(/isPrivate\(pathname\)/);
    expect(swSource).toMatch(/Network only/);
  });

  it("precaches offline fallback and cleans old storefront caches", () => {
    expect(swSource).toContain('"/offline"');
    expect(swSource).toContain("storefront-static-");
    expect(swSource).toContain("storefront-offline-");
    expect(swSource).toMatch(/caches\.delete/);
  });

  it("does not claim offline checkout or payment", () => {
    expect(swSource.toLowerCase()).not.toContain("offline checkout");
    expect(swSource.toLowerCase()).not.toContain("pay offline");
  });
});

describe("offline fallback route", () => {
  const pageSource = readFileSync(
    resolve(process.cwd(), "src/app/offline/page.tsx"),
    "utf8",
  );

  it("states connectivity is required and does not claim offline commerce", () => {
    expect(pageSource).toMatch(/You.?re offline/i);
    expect(pageSource).toMatch(/internet connection/i);
    expect(pageSource.toLowerCase()).not.toContain("checkout offline");
    expect(pageSource).toMatch(/Try again/);
  });
});

describe("image optimization helpers", () => {
  it("falls back to public object URL when transforms are disabled", () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM = "false";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const result = resolveOptimizedStorageUrl("products", "store/a.jpg", {
      width: 400,
      quality: 70,
    });
    expect(result).toContain("/storage/v1/object/public/products/");
    expect(result).not.toContain("/render/image/");
    process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM = prev;
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  });

  it("uses render path when transform flag is enabled", () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM = "true";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const result = resolveOptimizedStorageUrl("products", "store/a.jpg", {
      width: 400,
      quality: 70,
      resize: "cover",
    });
    expect(result).toContain("/storage/v1/render/image/public/products/");
    expect(result).toContain("width=400");
    expect(result).toContain("quality=70");
    process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM = prev;
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  });
});

describe("Three.js mount gates (lazy / mobile / reduced-motion)", () => {
  const baseFx = {
    ...DEFAULT_VISUAL_EFFECTS,
    enabled: true,
    heroEnabled: true,
    productEnabled: true,
    mobileEnabled: false,
    respectReducedMotion: true,
  };

  it("blocks hero 3d when reduced motion is preferred", () => {
    const result = shouldMountHero3d({
      visualEffects: baseFx,
      animationEnabled: true,
      prefersReducedMotion: true,
      isMobile: false,
      webglAvailable: true,
      section3dEnabled: true,
      sectionPreset: "FLOATING_SHAPES",
    });
    expect(result.mount).toBe(false);
  });

  it("blocks product 3d on mobile when mobileEnabled is false", () => {
    expect(
      shouldMountProduct3d({
        visualEffects: baseFx,
        animationEnabled: true,
        prefersReducedMotion: false,
        isMobile: true,
        webglAvailable: true,
        hasTrustedModel: true,
      }),
    ).toBe(false);
  });
});
