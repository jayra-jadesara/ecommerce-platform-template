import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";

export type CategoryDependencies = {
  productCount: number;
  childCount: number;
  canDelete: boolean;
  message: string;
  suggestion: "deactivate" | null;
};

export type ProductDependencies = {
  orderItemCount: number;
  inventoryMovementCount: number;
  cartItemCount: number;
  wishlistItemCount: number;
  canDelete: boolean;
  message: string;
  suggestion: "archive" | null;
};

export type MediaDependencies = {
  productImageCount: number;
  categoryCount: number;
  usageLabels: string[];
  canDelete: boolean;
  message: string;
};

export type BlogCategoryDependencies = {
  postCount: number;
  canDelete: boolean;
  message: string;
  suggestion: "deactivate" | null;
};

export type SizeOptionDependencies = {
  variantCount: number;
  canDelete: boolean;
  message: string;
  suggestion: "deactivate" | null;
};

function formatCount(n: number, singular: string, plural = `${singular}s`): string {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

export async function checkCategoryDependencies(
  categoryId: string,
): Promise<CategoryDependencies | null> {
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return null;

  const [{ count: productCount }, { count: childCount }] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("category_id", categoryId),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("parent_id", categoryId),
  ]);

  const products = productCount ?? 0;
  const children = childCount ?? 0;
  const canDelete = products === 0 && children === 0;

  let message = "This category can be deleted.";
  if (!canDelete) {
    const parts: string[] = [];
    if (products > 0) parts.push(formatCount(products, "product"));
    if (children > 0) parts.push(formatCount(children, "subcategory", "subcategories"));
    message = `This category is currently used by ${parts.join(" and ")}. Deactivate it instead to keep your catalog safe.`;
  }

  return {
    productCount: products,
    childCount: children,
    canDelete,
    message,
    suggestion: canDelete ? null : "deactivate",
  };
}

export async function checkProductDependencies(
  productId: string,
): Promise<ProductDependencies | null> {
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return null;

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!product) return null;

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  const variantIds = (variants ?? []).map((v) => v.id as string);

  let orderItemCount = 0;
  let inventoryMovementCount = 0;
  let cartItemCount = 0;
  let wishlistItemCount = 0;

  if (variantIds.length > 0) {
    const [
      { count: orderByVariant },
      { count: movements },
      { count: cartByVariant },
      { count: wishlistByVariant },
    ] = await Promise.all([
      supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .in("variant_id", variantIds),
      supabase
        .from("inventory_movements")
        .select("id", { count: "exact", head: true })
        .in("variant_id", variantIds),
      supabase
        .from("cart_items")
        .select("id", { count: "exact", head: true })
        .in("variant_id", variantIds),
      supabase
        .from("wishlist_items")
        .select("id", { count: "exact", head: true })
        .in("variant_id", variantIds),
    ]);
    orderItemCount += orderByVariant ?? 0;
    inventoryMovementCount = movements ?? 0;
    cartItemCount += cartByVariant ?? 0;
    wishlistItemCount += wishlistByVariant ?? 0;
  }

  const [{ count: orderByProduct }, { count: cartByProduct }, { count: wishByProduct }] =
    await Promise.all([
      supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId),
      supabase
        .from("cart_items")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId),
      supabase
        .from("wishlist_items")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId),
    ]);

  orderItemCount += orderByProduct ?? 0;
  cartItemCount += cartByProduct ?? 0;
  wishlistItemCount += wishByProduct ?? 0;

  const { count: footerFeatured } = await supabase
    .from("store_settings")
    .select("store_id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("footer_featured_product_id", productId);
  const footerFeaturedCount = footerFeatured ?? 0;

  const canDelete =
    orderItemCount === 0 &&
    inventoryMovementCount === 0 &&
    cartItemCount === 0 &&
    wishlistItemCount === 0 &&
    footerFeaturedCount === 0;

  let message = "This product can be deleted.";
  if (!canDelete) {
    const parts: string[] = [];
    if (orderItemCount > 0) {
      parts.push(formatCount(orderItemCount, "order line"));
    }
    if (inventoryMovementCount > 0) {
      parts.push(formatCount(inventoryMovementCount, "stock movement"));
    }
    if (cartItemCount > 0) {
      parts.push(formatCount(cartItemCount, "cart item"));
    }
    if (wishlistItemCount > 0) {
      parts.push(formatCount(wishlistItemCount, "wishlist item"));
    }
    if (footerFeaturedCount > 0) {
      parts.push("footer featured product");
    }
    message = `This product is currently used by ${parts.join(", ")}. Archive it instead so history and stock records stay intact.`;
  }

  return {
    orderItemCount,
    inventoryMovementCount,
    cartItemCount,
    wishlistItemCount,
    canDelete,
    message,
    suggestion: canDelete ? null : "archive",
  };
}

type PathUsageProbe = {
  label: string;
  count: number;
};

async function countStorePath(
  table:
    | "categories"
    | "banners"
    | "blog_categories"
    | "products"
    | "store_reels"
    | "store_brochures"
    | "coupons",
  column: string,
  storeId: string,
  path: string,
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq(column, path);
  return count ?? 0;
}

export async function checkMediaDependencies(
  storagePath: string,
): Promise<MediaDependencies | null> {
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return null;

  const path = storagePath.trim();
  if (!path) {
    return {
      productImageCount: 0,
      categoryCount: 0,
      usageLabels: [],
      canDelete: true,
      message: "This file can be deleted.",
    };
  }

  const probes: PathUsageProbe[] = [];

  const { count: productImageCountRaw } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("storage_path", path);
  const productImageCount = productImageCountRaw ?? 0;
  if (productImageCount > 0) {
    probes.push({ label: "products", count: productImageCount });
  }

  const categoryCount = await countStorePath(
    "categories",
    "image_path",
    storeId,
    path,
  );
  if (categoryCount > 0) probes.push({ label: "categories", count: categoryCount });

  const bannerCount = await countStorePath("banners", "image_path", storeId, path);
  if (bannerCount > 0) probes.push({ label: "banners", count: bannerCount });

  const blogCatCount = await countStorePath(
    "blog_categories",
    "image_path",
    storeId,
    path,
  );
  if (blogCatCount > 0) {
    probes.push({ label: "blog categories", count: blogCatCount });
  }

  const [{ count: blogFeatured }, { count: blogOg }] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("featured_image_path", path),
    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("og_image_path", path),
  ]);
  const blogPostCount = (blogFeatured ?? 0) + (blogOg ?? 0);
  if (blogPostCount > 0) probes.push({ label: "blog posts", count: blogPostCount });

  const [{ count: pageFeatured }, { count: pageOg }] = await Promise.all([
    supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("featured_image_path", path),
    supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("og_image_path", path),
  ]);
  const pageCount = (pageFeatured ?? 0) + (pageOg ?? 0);
  if (pageCount > 0) probes.push({ label: "CMS pages", count: pageCount });

  const productBannerCount = await countStorePath(
    "products",
    "banner_image_path",
    storeId,
    path,
  );
  if (productBannerCount > 0) {
    probes.push({ label: "product banners", count: productBannerCount });
  }

  const brandingHits = await Promise.all([
    supabase
      .from("store_branding")
      .select("store_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("logo_path", path),
    supabase
      .from("store_branding")
      .select("store_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("logo_dark_path", path),
    supabase
      .from("store_branding")
      .select("store_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("favicon_path", path),
    supabase
      .from("store_branding")
      .select("store_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("social_sharing_image_path", path),
  ]);
  const brandingTotal = brandingHits.reduce((sum, r) => sum + (r.count ?? 0), 0);
  if (brandingTotal > 0) probes.push({ label: "store branding", count: brandingTotal });

  const { count: seoOg } = await supabase
    .from("store_seo_settings")
    .select("store_id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("og_image_path", path);
  if ((seoOg ?? 0) > 0) probes.push({ label: "SEO settings", count: seoOg ?? 0 });

  const settingsHits = await Promise.all([
    supabase
      .from("store_settings")
      .select("store_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("products_listing_banner_image_path", path),
    supabase
      .from("store_settings")
      .select("store_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("contact_banner_image_path", path),
    supabase
      .from("store_settings")
      .select("store_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("contact_spotlight_image_path", path),
  ]);
  const settingsTotal = settingsHits.reduce((sum, r) => sum + (r.count ?? 0), 0);
  if (settingsTotal > 0) probes.push({ label: "store settings", count: settingsTotal });

  const reelVideoCount = await countStorePath(
    "store_reels",
    "video_path",
    storeId,
    path,
  );
  if (reelVideoCount > 0) probes.push({ label: "reels", count: reelVideoCount });

  const brochureCount = await countStorePath(
    "store_brochures",
    "pdf_path",
    storeId,
    path,
  );
  if (brochureCount > 0) probes.push({ label: "brochures", count: brochureCount });

  const couponPromo = await countStorePath(
    "coupons",
    "promo_image_url",
    storeId,
    path,
  );
  if (couponPromo > 0) probes.push({ label: "coupons", count: couponPromo });

  const canDelete = probes.length === 0;
  const usageLabels = probes.map((p) => p.label);

  let message = "This file can be deleted.";
  if (!canDelete) {
    message = `Can't delete this file because it is still used by ${usageLabels.join(", ")}. Remove or replace it there first.`;
  }

  return {
    productImageCount,
    categoryCount,
    usageLabels,
    canDelete,
    message,
  };
}

export async function checkBlogCategoryDependencies(
  categoryId: string,
): Promise<BlogCategoryDependencies | null> {
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return null;

  const { data: category } = await supabase
    .from("blog_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!category) return null;

  const { count } = await supabase
    .from("blog_post_categories")
    .select("post_id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  const postCount = count ?? 0;
  const canDelete = postCount === 0;
  const message = canDelete
    ? "This blog category can be deleted."
    : `This blog category is linked to ${formatCount(postCount, "post", "posts")}. Hide it instead so articles keep their categories.`;

  return {
    postCount,
    canDelete,
    message,
    suggestion: canDelete ? null : "deactivate",
  };
}

export async function checkSizeOptionDependencies(
  sizeOptionId: string,
): Promise<SizeOptionDependencies | null> {
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return null;

  const { data: option } = await supabase
    .from("product_size_options")
    .select("id, label")
    .eq("id", sizeOptionId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!option) return null;

  const label = (option.label as string).trim();
  if (!label) {
    return {
      variantCount: 0,
      canDelete: true,
      message: "This size can be deleted.",
      suggestion: null,
    };
  }

  const { data: products } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId);
  const productIds = (products ?? []).map((p) => p.id as string);
  if (productIds.length === 0) {
    return {
      variantCount: 0,
      canDelete: true,
      message: "This size can be deleted.",
      suggestion: null,
    };
  }

  const { count } = await supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .in("product_id", productIds)
    .eq("name", label);

  const variantCount = count ?? 0;
  const canDelete = variantCount === 0;
  const message = canDelete
    ? "This size can be deleted."
    : `This size label is used on ${formatCount(variantCount, "product variant")}. Deactivate it instead so existing products keep a matching size.`;

  return {
    variantCount,
    canDelete,
    message,
    suggestion: canDelete ? null : "deactivate",
  };
}
