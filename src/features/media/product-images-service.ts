import "server-only";

import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  CATALOG_CACHE_TAG,
  CATALOG_PRODUCTS_TAG,
  productCacheTag,
} from "@/features/catalog/cache";
import {
  assertSafeStoragePath,
  buildProductImagePath,
  validateImageUpload,
} from "@/features/media/validation";

export type ProductImageResult =
  | { ok: true; message: string; id?: string; image?: ProductImageRow }
  | { ok: false; error: string };

export type ProductImageRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  storage_path: string;
  public_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

async function getProductScope(productId: string) {
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return null;

  const { data } = await supabase
    .from("products")
    .select("id, slug, store_id, name")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!data) return null;
  return { supabase, storeId, product: data };
}

function revalidateProduct(productId: string, slug: string) {
  revalidateTag(CATALOG_CACHE_TAG, "max");
  revalidateTag(CATALOG_PRODUCTS_TAG, "max");
  revalidateTag(productCacheTag(productId), "max");
  revalidateTag(productCacheTag(slug), "max");
}

export async function listProductImages(
  productId: string,
): Promise<ProductImageRow[]> {
  const admin = await getCurrentAdmin();
  if (
    !admin ||
    !(
      hasPermission(admin, "product_images.view") ||
      hasPermission(admin, "products.view")
    )
  ) {
    return [];
  }

  const scope = await getProductScope(productId);
  if (!scope) return [];

  const { data } = await scope.supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data as ProductImageRow[] | null) ?? [];
}

export async function createProductImage(
  productId: string,
  formData: FormData,
): Promise<ProductImageResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "product_images.upload")) {
    return {
      ok: false,
      error: "You do not have permission to upload product images.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No image file provided." };
  }

  const altText =
    String(formData.get("altText") ?? "").trim() ||
    null;
  const variantIdRaw = String(formData.get("variantId") ?? "").trim();
  const variantId = variantIdRaw || null;
  const makePrimary = String(formData.get("isPrimary") ?? "") === "true";

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateImageUpload({
    declaredMime: file.type,
    size: file.size,
    fileName: file.name,
    bytes: new Uint8Array(buffer),
  });
  if (!validation.ok) return validation;

  const scope = await getProductScope(productId);
  if (!scope) return { ok: false, error: "Product not found for this store." };

  if (variantId) {
    const { data: variant } = await scope.supabase
      .from("product_variants")
      .select("id")
      .eq("id", variantId)
      .eq("product_id", productId)
      .maybeSingle();
    if (!variant) return { ok: false, error: "Variant not found for this product." };
  }

  const { count } = await scope.supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const nextOrder = count ?? 0;
  const shouldBePrimary = makePrimary || nextOrder === 0;

  const fileId = randomUUID();
  const path = buildProductImagePath({
    storeId: scope.storeId,
    productId,
    fileId,
    ext: validation.ext,
  });
  if (!assertSafeStoragePath(path)) {
    return { ok: false, error: "Invalid storage path." };
  }

  const { error: uploadError } = await scope.supabase.storage
    .from(STORAGE_BUCKETS.products)
    .upload(path, buffer, {
      contentType: validation.mime,
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      ok: false,
      error: "Unable to upload image. Check storage permissions and try again.",
    };
  }

  const publicUrl = resolvePublicStorageUrl(STORAGE_BUCKETS.products, path) ?? null;

  if (shouldBePrimary) {
    await scope.supabase
      .from("product_images")
      .update({ is_primary: false })
      .eq("product_id", productId)
      .eq("is_primary", true);
  }

  const { data, error } = await scope.supabase
    .from("product_images")
    .insert({
      product_id: productId,
      variant_id: variantId,
      storage_path: path,
      public_url: publicUrl,
      alt_text: altText ?? `${scope.product.name} image`,
      sort_order: nextOrder,
      is_primary: shouldBePrimary,
    })
    .select("*")
    .single();

  if (error || !data) {
    await scope.supabase.storage.from(STORAGE_BUCKETS.products).remove([path]);
    return { ok: false, error: "Unable to save product image metadata." };
  }

  // Also register in media library for reuse.
  await scope.supabase.from("media").upsert(
    {
      store_id: scope.storeId,
      storage_path: path,
      public_url: publicUrl,
      file_name: file.name.slice(0, 240),
      mime_type: validation.mime,
      file_size: file.size,
      alt_text: altText ?? `${scope.product.name} image`,
      folder: "products",
      uploaded_by: admin.user.id,
    },
    { onConflict: "store_id,storage_path" },
  );

  await scope.supabase.from("audit_logs").insert({
    store_id: scope.storeId,
    user_id: admin.user.id,
    action: "PRODUCT_IMAGE_ADDED",
    entity_type: "product_images",
    entity_id: data.id,
    metadata: {
      product_id: productId,
      path,
      is_primary: shouldBePrimary,
    },
  });

  revalidateProduct(productId, scope.product.slug);
  return {
    ok: true,
    message: "Product image uploaded.",
    id: data.id,
    image: data as ProductImageRow,
  };
}

export async function deleteProductImage(
  imageId: string,
): Promise<ProductImageResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "product_images.delete")) {
    return {
      ok: false,
      error: "You do not have permission to delete product images.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const { data: image } = await supabase
    .from("product_images")
    .select("*, products!inner(id, slug, store_id)")
    .eq("id", imageId)
    .maybeSingle();

  const product = image?.products as
    | { id: string; slug: string; store_id: string }
    | { id: string; slug: string; store_id: string }[]
    | null
    | undefined;
  const productRow = Array.isArray(product) ? product[0] : product;
  if (!image || !productRow || productRow.store_id !== storeId) {
    return { ok: false, error: "Image not found for this store." };
  }

  const wasPrimary = image.is_primary;
  const productId = image.product_id as string;
  const path = image.storage_path as string;

  const { error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);

  if (error) return { ok: false, error: "Unable to delete product image." };

  // Remove storage object only if unused by other product_images.
  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("storage_path", path);

  if ((count ?? 0) === 0 && assertSafeStoragePath(path)) {
    await supabase.storage.from(STORAGE_BUCKETS.products).remove([path]);
    await supabase
      .from("media")
      .delete()
      .eq("store_id", storeId)
      .eq("storage_path", path);
  }

  if (wasPrimary) {
    const { data: next } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", next.id);
    }
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "PRODUCT_IMAGE_DELETED",
    entity_type: "product_images",
    entity_id: imageId,
    metadata: { product_id: productId, path },
  });

  revalidateProduct(productId, productRow.slug);
  return { ok: true, message: "Product image deleted." };
}

export async function setPrimaryProductImage(
  imageId: string,
): Promise<ProductImageResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "product_images.update")) {
    return {
      ok: false,
      error: "You do not have permission to update product images.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const { data: image } = await supabase
    .from("product_images")
    .select("*, products!inner(id, slug, store_id)")
    .eq("id", imageId)
    .maybeSingle();

  const product = image?.products as
    | { id: string; slug: string; store_id: string }
    | { id: string; slug: string; store_id: string }[]
    | null
    | undefined;
  const productRow = Array.isArray(product) ? product[0] : product;
  if (!image || !productRow || productRow.store_id !== storeId) {
    return { ok: false, error: "Image not found for this store." };
  }

  const productId = image.product_id as string;

  await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId)
    .eq("is_primary", true);

  const { error } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId);

  if (error) return { ok: false, error: "Unable to set primary image." };

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "PRODUCT_PRIMARY_IMAGE_CHANGED",
    entity_type: "product_images",
    entity_id: imageId,
    metadata: { product_id: productId },
  });

  revalidateProduct(productId, productRow.slug);
  return { ok: true, message: "Primary image updated." };
}

export async function reorderProductImages(
  productId: string,
  orderedIds: string[],
): Promise<ProductImageResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "product_images.update")) {
    return {
      ok: false,
      error: "You do not have permission to reorder product images.",
    };
  }

  const scope = await getProductScope(productId);
  if (!scope) return { ok: false, error: "Product not found for this store." };

  const unique = [...new Set(orderedIds)];
  const { data: existing } = await scope.supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId);

  const existingIds = new Set((existing ?? []).map((row) => row.id));
  if (
    unique.length !== existingIds.size ||
    unique.some((id) => !existingIds.has(id))
  ) {
    return { ok: false, error: "Invalid image order payload." };
  }

  for (let index = 0; index < unique.length; index += 1) {
    const { error } = await scope.supabase
      .from("product_images")
      .update({ sort_order: index })
      .eq("id", unique[index])
      .eq("product_id", productId);
    if (error) return { ok: false, error: "Unable to reorder images." };
  }

  await scope.supabase.from("audit_logs").insert({
    store_id: scope.storeId,
    user_id: admin.user.id,
    action: "PRODUCT_IMAGE_REORDERED",
    entity_type: "products",
    entity_id: productId,
    metadata: { ordered_ids: unique },
  });

  revalidateProduct(productId, scope.product.slug);
  return { ok: true, message: "Image order saved." };
}

export async function updateProductImageAlt(
  imageId: string,
  altText: string,
): Promise<ProductImageResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "product_images.update")) {
    return {
      ok: false,
      error: "You do not have permission to update product images.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const { data: image } = await supabase
    .from("product_images")
    .select("*, products!inner(id, slug, store_id)")
    .eq("id", imageId)
    .maybeSingle();

  const product = image?.products as
    | { id: string; slug: string; store_id: string }
    | { id: string; slug: string; store_id: string }[]
    | null
    | undefined;
  const productRow = Array.isArray(product) ? product[0] : product;
  if (!image || !productRow || productRow.store_id !== storeId) {
    return { ok: false, error: "Image not found for this store." };
  }

  const { error } = await supabase
    .from("product_images")
    .update({ alt_text: altText.trim() || null })
    .eq("id", imageId);

  if (error) return { ok: false, error: "Unable to update alt text." };

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "PRODUCT_IMAGE_UPDATED",
    entity_type: "product_images",
    entity_id: imageId,
    metadata: { product_id: image.product_id },
  });

  revalidateProduct(image.product_id as string, productRow.slug);
  return { ok: true, message: "Image updated." };
}
