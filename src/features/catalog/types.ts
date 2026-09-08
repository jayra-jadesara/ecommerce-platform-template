import type { StockStatus } from "@/features/catalog/stock";

export type StorefrontProductImage = {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
  variantId: string | null;
  sortOrder: number;
};

export type StorefrontProductDetail = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  brand: string | null;
  ingredients: string | null;
  usageInstructions: string | null;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Trusted store-scoped GLB/GLTF path, or null. */
  modelPath: string | null;
  category: { id: string; name: string; slug: string } | null;
  images: StorefrontProductImage[];
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    compareAtPrice: number | null;
    weight: number | null;
    unit: string | null;
    stockStatus: StockStatus;
    available: number;
  }>;
};
