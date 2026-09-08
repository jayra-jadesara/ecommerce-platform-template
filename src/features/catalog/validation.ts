import { z } from "zod";
import { isValidSlug, slugify } from "@/features/catalog/slug";
import { safeModelPathSchema } from "@/features/visual-effects/schemas";

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120)
  .transform((value) => slugify(value))
  .refine((value) => isValidSlug(value), {
    message: "Slug must be lowercase letters, numbers, and hyphens.",
  });

export const moneySchema = z.coerce
  .number()
  .finite()
  .min(0, "Price cannot be negative")
  .max(999_999_999.99)
  .transform((value) => Math.round(value * 100) / 100);

export const optionalMoneySchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.number().finite().min(0).max(999_999_999.99).nullable(),
).transform((value) =>
  value == null ? null : Math.round(Number(value) * 100) / 100,
);

export const weightSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.number().finite().min(0).max(999_999).nullable(),
);

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: slugSchema,
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v.trim()),
  parentId: z.string().uuid().nullable(),
  imagePath: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().trim().max(512).nullable(),
  ),
  sortOrder: z.coerce.number().int().min(0).max(100_000),
  isActive: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const variantFormSchema = z
  .object({
    id: z.string().uuid().nullable().optional(),
    clientKey: z.string().min(1),
    name: z.string().trim().min(1, "Variant name is required").max(80),
    sku: z
      .string()
      .trim()
      .min(1, "SKU is required")
      .max(64)
      .regex(/^[A-Za-z0-9][A-Za-z0-9\-_.]*$/, "SKU contains invalid characters"),
    price: moneySchema,
    compareAtPrice: optionalMoneySchema,
    costPrice: optionalMoneySchema,
    weight: weightSchema,
    unit: z
      .string()
      .trim()
      .max(32)
      .transform((v) => v.trim()),
    trackInventory: z.boolean(),
    isActive: z.boolean(),
    quantity: z.coerce.number().int().min(0).max(1_000_000_000),
    reservedQuantity: z.coerce.number().int().min(0).max(1_000_000_000),
    lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000_000),
    _delete: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.compareAtPrice != null &&
      value.compareAtPrice < value.price
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Compare-at price should be greater than or equal to price.",
        path: ["compareAtPrice"],
      });
    }
    if (value.reservedQuantity > value.quantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reserved quantity cannot exceed quantity.",
        path: ["reservedQuantity"],
      });
    }
  });

export type VariantFormValues = z.infer<typeof variantFormSchema>;

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  slug: slugSchema,
  categoryId: z.string().uuid().nullable(),
  brand: z
    .string()
    .trim()
    .max(80)
    .transform((v) => v.trim()),
  shortDescription: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v.trim()),
  description: z
    .string()
    .trim()
    .max(20_000)
    .transform((v) => v.trim()),
  ingredients: z
    .string()
    .trim()
    .max(10_000)
    .transform((v) => v.trim()),
  usageInstructions: z
    .string()
    .trim()
    .max(10_000)
    .transform((v) => v.trim()),
  status: z.enum(["draft", "active", "archived"]),
  featured: z.boolean(),
  seoTitle: z
    .string()
    .trim()
    .max(120)
    .transform((v) => v.trim()),
  seoDescription: z
    .string()
    .trim()
    .max(320)
    .transform((v) => v.trim()),
  /** Optional trusted path: products/{storeId}/3d/{file}.glb|gltf */
  modelPath: safeModelPathSchema.optional().default(null),
  variants: z.array(variantFormSchema).min(1, "Add at least one variant").max(50),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const inventoryUpdateSchema = z
  .object({
    variantId: z.string().uuid(),
    quantity: z.coerce.number().int().min(0).max(1_000_000_000),
    reservedQuantity: z.coerce.number().int().min(0).max(1_000_000_000),
    lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000_000),
  })
  .superRefine((value, ctx) => {
    if (value.reservedQuantity > value.quantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reserved quantity cannot exceed quantity.",
        path: ["reservedQuantity"],
      });
    }
  });

export type InventoryUpdateValues = z.infer<typeof inventoryUpdateSchema>;

export const PRODUCT_SORT_OPTIONS = [
  "newest",
  "oldest",
  "name",
  "name_desc",
  "price",
  "price_desc",
  "stock",
  "featured",
] as const;

export type ProductSortOption = (typeof PRODUCT_SORT_OPTIONS)[number];

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional().default(""),
  categoryId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || undefined),
  status: z
    .enum(["draft", "active", "archived", "all"])
    .optional()
    .default("all"),
  featured: z
    .enum(["all", "true", "false"])
    .optional()
    .default("all"),
  stock: z
    .enum(["all", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"])
    .optional()
    .default("all"),
  sort: z.enum(PRODUCT_SORT_OPTIONS).optional().default("newest"),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const DEFAULT_CATEGORY_FORM: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  parentId: null,
  imagePath: null,
  sortOrder: 0,
  isActive: true,
};

export function emptyVariant(clientKey: string): VariantFormValues {
  return {
    id: null,
    clientKey,
    name: "One size",
    sku: "",
    price: 0,
    compareAtPrice: null,
    costPrice: null,
    weight: null,
    unit: "",
    trackInventory: true,
    isActive: true,
    quantity: 0,
    reservedQuantity: 0,
    lowStockThreshold: 5,
    _delete: false,
  };
}

/** Common pack sizes shoppers understand (spices, grocery, apparel, packs). */
export const PRODUCT_SIZE_OPTIONS = [
  "One size",
  "Small",
  "Medium",
  "Large",
  "XL",
  "XXL",
  "50 g",
  "100 g",
  "250 g",
  "500 g",
  "1 kg",
  "250 ml",
  "500 ml",
  "1 L",
  "Pack of 1",
  "Pack of 2",
  "Pack of 4",
  "Pack of 6",
  "Pack of 12",
] as const;

export const PRODUCT_UNIT_OPTIONS = [
  "",
  "g",
  "kg",
  "ml",
  "L",
  "piece",
  "pack",
] as const;

export const DEFAULT_PRODUCT_FORM: ProductFormValues = {
  name: "",
  slug: "",
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
  modelPath: null,
  variants: [emptyVariant("variant-1")],
};
