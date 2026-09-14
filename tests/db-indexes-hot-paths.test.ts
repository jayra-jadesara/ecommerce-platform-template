import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260915120000_perf_hot_path_indexes.sql",
  ),
  "utf8",
);

describe("hot-path index migration", () => {
  it("adds catalog composites used by storefront PLP", () => {
    expect(sql).toContain("products_store_status_created_idx");
    expect(sql).toContain("products_store_status_category_idx");
    expect(sql).toContain("products_store_status_featured_idx");
    expect(sql).toContain("categories_store_active_sort_idx");
    expect(sql).toContain("product_images_product_sort_idx");
  });

  it("adds account/checkout payment and order composites", () => {
    expect(sql).toContain("orders_user_created_at_idx");
    expect(sql).toContain("orders_user_created_nonpending_idx");
    expect(sql).toContain("payments_user_created_at_idx");
    expect(sql).toContain("payments_user_status_idx");
    expect(sql).toContain("payments_order_status_idx");
  });

  it("adds wishlist membership and CMS/blog helpers", () => {
    expect(sql).toContain("wishlist_items_wishlist_product_idx");
    expect(sql).toContain("page_sections_page_active_sort_idx");
    expect(sql).toContain("blog_posts_store_status_published_idx");
    expect(sql).toContain("blog_post_categories_store_category_idx");
  });

  it("enables trigram search for admin/store ilike", () => {
    expect(sql).toContain("create extension if not exists pg_trgm");
    expect(sql).toContain("products_name_trgm_idx");
    expect(sql).toContain("orders_order_number_trgm_idx");
  });

  it("uses idempotent create index if not exists", () => {
    const creates = sql.match(/create index if not exists/gi) ?? [];
    expect(creates.length).toBeGreaterThanOrEqual(15);
    expect(sql).not.toMatch(/create index concurrently/i);
  });
});
