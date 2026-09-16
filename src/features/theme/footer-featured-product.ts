import "server-only";
import { cache } from "react";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { resolveOptimizedStorageUrl } from "@/lib/supabase/storage-url";
import type { FooterFeaturedProduct } from "@/types/config";
import { getPlatformConfigAsync } from "@/config/site.server";

/** Resolve optional footer highlight product for storefront chrome. */
export const getFooterFeaturedProduct = cache(
  async (): Promise<FooterFeaturedProduct | null> => {
    const config = await getPlatformConfigAsync();
    const footer = config.footer;
    if (!footer.showFeaturedProduct || !footer.featuredProductId) return null;

    const supabase = createSupabasePublicClient();
    if (!supabase) return null;

    const { data: product } = await supabase
      .from("products")
      .select("id, name, slug")
      .eq("id", footer.featuredProductId)
      .eq("status", "active")
      .maybeSingle();

    if (!product) return null;

    const { data: image } = await supabase
      .from("product_images")
      .select("storage_path, public_url, is_primary, sort_order")
      .eq("product_id", product.id)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    const imageUrl =
      image?.public_url?.trim() ||
      (image?.storage_path
        ? resolveOptimizedStorageUrl("products", image.storage_path, {
            width: 320,
            quality: 75,
          })
        : null);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: imageUrl ?? null,
    };
  },
);
