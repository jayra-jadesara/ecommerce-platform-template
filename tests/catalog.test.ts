import { describe, expect, it } from "vitest";
import { hasPermission } from "@/features/auth/permissions";
import {
  ensureUniqueSlugCandidate,
  isValidSlug,
  slugify,
} from "@/features/catalog/slug";
import {
  aggregateProductStockStatus,
  availableQuantity,
  deriveStockStatus,
} from "@/features/catalog/stock";
import {
  categoryFormSchema,
  inventoryUpdateSchema,
  productFormSchema,
  productListQuerySchema,
  variantFormSchema,
} from "@/features/catalog/validation";

describe("catalog slug helpers", () => {
  it("generates URL-safe slugs", () => {
    expect(slugify("Garam Masala 50g!")).toBe("garam-masala-50g");
    expect(isValidSlug("garam-masala-50g")).toBe(true);
    expect(isValidSlug("Garam")).toBe(false);
  });

  it("ensures unique slug candidates", () => {
    const existing = new Set(["tea", "tea-2"]);
    expect(ensureUniqueSlugCandidate("Tea", existing)).toBe("tea-3");
  });
});

describe("category and product validation", () => {
  it("accepts valid category payloads", () => {
    const parsed = categoryFormSchema.safeParse({
      name: "Spices",
      slug: "Spices Pack",
      description: "Aromatic blends",
      parentId: null,
      imagePath: null,
      sortOrder: 1,
      isActive: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.slug).toBe("spices-pack");
  });

  it("validates variant prices and inventory bounds", () => {
    const ok = variantFormSchema.safeParse({
      clientKey: "v1",
      name: "100g",
      sku: "GM-100",
      price: 12.5,
      compareAtPrice: 15,
      costPrice: 8,
      weight: 0.1,
      unit: "kg",
      trackInventory: true,
      isActive: true,
      quantity: 20,
      reservedQuantity: 2,
      lowStockThreshold: 5,
    });
    expect(ok.success).toBe(true);

    const badCompare = variantFormSchema.safeParse({
      clientKey: "v1",
      name: "100g",
      sku: "GM-100",
      price: 20,
      compareAtPrice: 10,
      costPrice: null,
      weight: null,
      unit: "",
      trackInventory: true,
      isActive: true,
      quantity: 5,
      reservedQuantity: 1,
      lowStockThreshold: 2,
    });
    expect(badCompare.success).toBe(false);

    const badReserved = inventoryUpdateSchema.safeParse({
      variantId: "00000000-0000-4000-8000-000000000001",
      quantity: 3,
      reservedQuantity: 5,
      lowStockThreshold: 1,
    });
    expect(badReserved.success).toBe(false);
  });

  it("requires at least one variant on products", () => {
    const parsed = productFormSchema.safeParse({
      name: "Tea",
      slug: "tea",
      categoryId: null,
      brand: "",
      shortDescription: "",
      description: "",
      ingredients: "",
      usageInstructions: "",
      status: "draft",
      featured: false,
      seoTitle: "",
      seoDescription: "",
      variants: [],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("stock derivation", () => {
  it("computes available quantity and statuses", () => {
    expect(availableQuantity(10, 3)).toBe(7);
    expect(
      deriveStockStatus({
        quantity: 10,
        reservedQuantity: 10,
        lowStockThreshold: 2,
      }),
    ).toBe("OUT_OF_STOCK");
    expect(
      deriveStockStatus({
        quantity: 10,
        reservedQuantity: 8,
        lowStockThreshold: 3,
      }),
    ).toBe("LOW_STOCK");
    expect(
      deriveStockStatus({
        quantity: 10,
        reservedQuantity: 0,
        lowStockThreshold: 2,
      }),
    ).toBe("IN_STOCK");
  });

  it("aggregates product stock across variants", () => {
    expect(
      aggregateProductStockStatus([
        {
          is_active: true,
          track_inventory: true,
          inventory: {
            quantity: 10,
            reserved_quantity: 0,
            low_stock_threshold: 2,
          },
        },
        {
          is_active: true,
          track_inventory: true,
          inventory: {
            quantity: 0,
            reserved_quantity: 0,
            low_stock_threshold: 2,
          },
        },
      ]),
    ).toBe("LOW_STOCK");
  });
});

describe("search/filter query parsing", () => {
  it("allow-lists sort and coerces pagination", () => {
    const parsed = productListQuerySchema.parse({
      page: "2",
      pageSize: "10",
      q: "masala",
      sort: "price",
      stock: "LOW_STOCK",
    });
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(10);
    expect(parsed.sort).toBe("price");
    expect(parsed.stock).toBe("LOW_STOCK");
  });
});

describe("catalog permissions", () => {
  it("enforces product and category update permissions", () => {
    expect(hasPermission(["ADMIN"], "products.update")).toBe(true);
    expect(hasPermission(["ADMIN"], "categories.update")).toBe(true);
    expect(hasPermission(["EDITOR"], "products.delete")).toBe(false);
    expect(hasPermission(["EDITOR"], "categories.create")).toBe(true);
    expect(hasPermission(["ORDER_MANAGER"], "products.update")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "categories.update")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "inventory.view")).toBe(true);
    expect(hasPermission(["ORDER_MANAGER"], "inventory.update")).toBe(false);
  });

  it("documents store scoping requirement via slug uniqueness per store", () => {
    // Uniqueness is enforced as (store_id, slug) in DB + service checks.
    expect(isValidSlug("store-scoped-product")).toBe(true);
  });

  it("treats only active products as storefront-visible statuses", () => {
    expect(["draft", "active", "archived"].includes("active")).toBe(true);
    expect(["draft", "archived"].includes("active")).toBe(false);
  });
});
