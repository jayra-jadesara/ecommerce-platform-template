import "server-only";

import { revalidatePath } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import {
  DEFAULT_PRODUCT_BLOG_HEADING,
  DEFAULT_PRODUCT_DETAIL_SECTIONS,
  DEFAULT_PRODUCT_FAQ_HEADING,
  type ProductPageSettings,
} from "@/features/catalog/product-page-settings";
import {
  normalizeProductPageSettings,
  productPageSettingsSchema,
} from "@/features/catalog/product-page-settings-parse";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodValidationFailure } from "@/lib/validation";

const SETTINGS_ROUTE = getAdminPath("/catalog/sizes");

async function resolveStoreId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    return resolveActiveStoreId(supabase);
  } catch {
    return null;
  }
}

export async function getProductPageSettings(): Promise<ProductPageSettings> {
  const storeId = await resolveStoreId();
  if (!storeId) {
    return {
      sections: DEFAULT_PRODUCT_DETAIL_SECTIONS.map((s) => ({ ...s })),
      faqHeading: DEFAULT_PRODUCT_FAQ_HEADING,
      faqQuestions: [],
      listingBannerEnabled: false,
      listingBannerImagePath: null,
      blogEnabled: true,
      blogHeading: DEFAULT_PRODUCT_BLOG_HEADING,
    };
  }

  const publicClient = createSupabasePublicClient();
  const supabase = publicClient ?? (await createSupabaseServerClient());
  const { data } = await supabase
    .from("store_settings")
    .select(
      "product_detail_sections, product_faq_heading, product_faq_questions, products_listing_banner_enabled, products_listing_banner_image_path, product_blog_enabled, product_blog_heading",
    )
    .eq("store_id", storeId)
    .maybeSingle();

  return normalizeProductPageSettings({
    product_detail_sections: data?.product_detail_sections,
    product_faq_heading: data?.product_faq_heading,
    product_faq_questions: data?.product_faq_questions,
    products_listing_banner_enabled: data?.products_listing_banner_enabled,
    products_listing_banner_image_path:
      data?.products_listing_banner_image_path,
    product_blog_enabled: data?.product_blog_enabled,
    product_blog_heading: data?.product_blog_heading,
  });
}

export async function updateProductPageSettings(
  input: unknown,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "products.update")) {
    return {
      ok: false,
      error: "You do not have permission to update product page settings.",
    };
  }

  const parsed = productPageSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid product page settings.");
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const sections = parsed.data.sections.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));
  const faqQuestions = parsed.data.faqQuestions.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));

  const listingBannerImagePath =
    parsed.data.listingBannerImagePath?.trim() || null;

  const { error } = await supabase.from("store_settings").upsert(
    {
      store_id: storeId,
      product_detail_sections: sections,
      product_faq_heading: parsed.data.faqHeading.trim(),
      product_faq_questions: faqQuestions,
      products_listing_banner_enabled: parsed.data.listingBannerEnabled,
      products_listing_banner_image_path: listingBannerImagePath,
      product_blog_enabled: parsed.data.blogEnabled,
      product_blog_heading:
        parsed.data.blogHeading.trim() || DEFAULT_PRODUCT_BLOG_HEADING,
    },
    { onConflict: "store_id" },
  );

  if (error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "UPDATE_PRODUCT_PAGE_SETTINGS",
      feature: "PRODUCTS",
      message: "Unable to save product page settings",
      error,
      databaseCode: error.code,
      storeId,
      route: SETTINGS_ROUTE,
    });
  }

  revalidatePath(SETTINGS_ROUTE);
  revalidatePath("/products");
  revalidatePath("/products", "layout");
  return { ok: true, message: "Product page settings saved." };
}
