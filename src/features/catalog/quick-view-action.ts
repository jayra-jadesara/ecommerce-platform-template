"use server";

import { getStorefrontProductBySlug } from "@/features/catalog/storefront";
import type { StorefrontProductDetail } from "@/features/catalog/types";

/** Load a published product for Quick View (storefront). */
export async function getProductQuickViewAction(
  slug: string,
): Promise<StorefrontProductDetail | null> {
  const trimmed = slug.trim();
  if (!trimmed || trimmed.length > 200) return null;
  try {
    return await getStorefrontProductBySlug(trimmed);
  } catch {
    return null;
  }
}
