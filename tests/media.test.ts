import { describe, expect, it } from "vitest";
import { hasPermission } from "@/features/auth/permissions";
import {
  assertSafeStoragePath,
  assertSafeStorageSegment,
  buildGeneralMediaPath,
  buildProductImagePath,
  detectImageMimeFromBytes,
  validateImageUpload,
} from "@/features/media/validation";

describe("media file validation", () => {
  it("accepts jpeg/png/webp metadata", () => {
    expect(
      validateImageUpload({
        declaredMime: "image/png",
        size: 2048,
        fileName: "photo.png",
      }).ok,
    ).toBe(true);
  });

  it("rejects svg and oversized files", () => {
    expect(
      validateImageUpload({
        declaredMime: "image/svg+xml",
        size: 100,
        fileName: "icon.svg",
      }).ok,
    ).toBe(false);
    expect(
      validateImageUpload({
        declaredMime: "image/jpeg",
        size: 20 * 1024 * 1024,
        fileName: "big.jpg",
      }).ok,
    ).toBe(false);
  });

  it("detects mime from magic bytes and rejects mismatch", () => {
    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(detectImageMimeFromBytes(pngHeader)).toBe("image/png");
    expect(
      validateImageUpload({
        declaredMime: "image/jpeg",
        size: pngHeader.length,
        fileName: "x.jpg",
        bytes: pngHeader,
      }).ok,
    ).toBe(false);
    expect(
      validateImageUpload({
        declaredMime: "image/png",
        size: pngHeader.length,
        fileName: "x.png",
        bytes: pngHeader,
      }).ok,
    ).toBe(true);
  });
});

describe("storage path security", () => {
  it("builds store-scoped product image paths", () => {
    const path = buildProductImagePath({
      storeId: "11111111-1111-4111-8111-111111111111",
      productId: "22222222-2222-4222-8222-222222222222",
      fileId: "33333333-3333-4333-8333-333333333333",
      ext: "webp",
    });
    expect(path).toContain("products/");
    expect(path.endsWith(".webp")).toBe(true);
    expect(assertSafeStoragePath(path)).toBe(true);
  });

  it("rejects path traversal", () => {
    expect(assertSafeStoragePath("../etc/passwd")).toBe(false);
    expect(assertSafeStoragePath("products/../secret")).toBe(false);
    expect(assertSafeStorageSegment("..")).toBe(false);
    expect(assertSafeStorageSegment("ok-name_1")).toBe(true);
  });

  it("builds library media paths by folder", () => {
    const path = buildGeneralMediaPath({
      storeId: "11111111-1111-4111-8111-111111111111",
      folder: "cms",
      fileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ext: "jpg",
    });
    expect(path.startsWith("cms/")).toBe(true);
    expect(path.includes("/library/")).toBe(true);
  });
});

describe("media permissions", () => {
  it("grants ADMIN full media and product image permissions", () => {
    expect(hasPermission(["ADMIN"], "media.upload")).toBe(true);
    expect(hasPermission(["ADMIN"], "media.update")).toBe(true);
    expect(hasPermission(["ADMIN"], "media.delete")).toBe(true);
    expect(hasPermission(["ADMIN"], "product_images.upload")).toBe(true);
    expect(hasPermission(["ADMIN"], "product_images.delete")).toBe(true);
  });

  it("allows EDITOR upload/update but not delete", () => {
    expect(hasPermission(["EDITOR"], "media.upload")).toBe(true);
    expect(hasPermission(["EDITOR"], "media.update")).toBe(true);
    expect(hasPermission(["EDITOR"], "media.delete")).toBe(false);
    expect(hasPermission(["EDITOR"], "product_images.upload")).toBe(true);
    expect(hasPermission(["EDITOR"], "product_images.update")).toBe(true);
    expect(hasPermission(["EDITOR"], "product_images.delete")).toBe(false);
  });

  it("denies ORDER_MANAGER media management", () => {
    expect(hasPermission(["ORDER_MANAGER"], "media.view")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "product_images.view")).toBe(false);
  });
});

describe("product image rules", () => {
  it("documents primary uniqueness and ordering contracts", () => {
    // DB enforces one primary per product via unique partial index.
    // Service unsets previous primary before setting a new one.
    const ordered = ["a", "b", "c"].map((id, sort_order) => ({
      id,
      sort_order,
      is_primary: id === "a",
    }));
    expect(ordered.filter((row) => row.is_primary)).toHaveLength(1);
    expect(ordered.map((row) => row.sort_order)).toEqual([0, 1, 2]);
  });

  it("requires store-scoped product paths", () => {
    expect(() =>
      buildProductImagePath({
        storeId: "../bad",
        productId: "22222222-2222-4222-8222-222222222222",
        fileId: "33333333-3333-4333-8333-333333333333",
        ext: "png",
      }),
    ).toThrow();
  });
});
