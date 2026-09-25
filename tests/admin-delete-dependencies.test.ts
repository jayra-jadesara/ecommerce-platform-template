import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Admin delete dependency guards", () => {
  it("central helpers cover category, product, media, blog category, size option", () => {
    const src = read("src/features/admin/validation/dependencies.ts");
    expect(src).toContain("checkCategoryDependencies");
    expect(src).toContain("checkProductDependencies");
    expect(src).toContain("checkMediaDependencies");
    expect(src).toContain("checkBlogCategoryDependencies");
    expect(src).toContain("checkSizeOptionDependencies");
    expect(src).toContain("inventory_movements");
    expect(src).toContain("order_items");
    expect(src).toContain("cart_items");
    expect(src).toContain("wishlist_items");
    expect(src).toContain("footer_featured_product_id");
    expect(src).toContain("store_branding");
    expect(src).toContain("blog_post_categories");
  });

  it("product/category/media delete services enforce dependency checks", () => {
    expect(read("src/features/catalog/products-service.ts")).toContain(
      "checkProductDependencies",
    );
    expect(read("src/features/catalog/categories-service.ts")).toContain(
      "checkCategoryDependencies",
    );
    expect(read("src/features/media/media-service.ts")).toContain(
      "checkMediaDependencies",
    );
    expect(read("src/features/blog/categories-service.ts")).toContain(
      "checkBlogCategoryDependencies",
    );
    expect(read("src/features/catalog/size-options-service.ts")).toContain(
      "checkSizeOptionDependencies",
    );
  });

  it("Admin UI opens blocked ConfirmDeleteDialog with safe actions", () => {
    expect(read("src/features/catalog/components/ProductListTable.tsx")).toContain(
      "checkProductDependenciesAction",
    );
    expect(read("src/features/catalog/components/CategoryManager.tsx")).toContain(
      "checkCategoryDependenciesAction",
    );
    expect(read("src/features/media/components/MediaLibraryClient.tsx")).toContain(
      "checkMediaDependenciesAction",
    );
    expect(
      read("src/features/blog/components/BlogCategoriesPanel.tsx"),
    ).toContain("checkBlogCategoryDependenciesAction");
    expect(
      read("src/features/blog/components/BlogCategoriesPanel.tsx"),
    ).toContain("safeActionLabel");
    expect(
      read("src/features/catalog/components/SizeOptionsManager.tsx"),
    ).toContain("checkSizeOptionDependenciesAction");
    expect(
      read("src/features/catalog/components/SizeOptionsManager.tsx"),
    ).toContain("deactivateSizeOptionAction");
  });

  it("coupons still prefer deactivate when redemptions exist", () => {
    const src = read("src/features/coupons/admin-service.ts");
    expect(src).toContain("coupon_redemptions");
    expect(src).toContain("deactivated instead of deleted");
  });
});
