"use server";

import {
  listStorefrontProductsBySlugs,
} from "@/features/catalog/storefront";
import type { StorefrontProductCard } from "@/features/catalog/storefront";

export async function getProductsBySlugsAction(
  slugs: string[],
): Promise<StorefrontProductCard[]> {
  if (!Array.isArray(slugs) || slugs.length === 0) return [];
  const cleaned = slugs
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 200)
    .slice(0, 12);
  if (!cleaned.length) return [];
  try {
    return await listStorefrontProductsBySlugs(cleaned);
  } catch {
    return [];
  }
}
