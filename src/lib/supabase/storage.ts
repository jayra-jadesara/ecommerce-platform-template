/** Logical Supabase Storage bucket ids (created in migrations). */
export const STORAGE_BUCKETS = {
  branding: "branding",
  products: "products",
  categories: "categories",
  cms: "cms",
  media: "media",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
