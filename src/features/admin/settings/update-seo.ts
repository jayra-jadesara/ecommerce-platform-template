import "server-only";

import { getAdminPath } from "@/config/admin-route";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import {
  buildPageSeoPayload,
  buildSchemaSettingsPayload,
  parseKeywordsInput,
  seoSettingsSchema,
  type SeoSettingsFormValues,
} from "@/features/admin/settings/schemas";
import { loadStorefrontPathsFromNavigation } from "@/features/seo/storefront-paths.server";
import { cmsSlugFromPath } from "@/features/seo/storefront-paths";
import { syncSitemapRowsFromCatalog } from "@/features/seo/sitemap-paths";
import {
  resolveActiveStoreId,
  type SettingsUpdateResult,
} from "@/features/admin/settings/store-context";
import { diffChangedKeys } from "@/features/admin/settings/validation";
import { publishStorefrontSync } from "@/features/sync/server";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { zodValidationFailure } from "@/lib/validation";
import type { Json } from "@/types/database";

const SEO_ROUTE = getAdminPath("/settings/seo");

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function updateSeoSettings(
  input: unknown,
): Promise<SettingsUpdateResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "seo.update")) {
    return {
      ok: false,
      error: "You do not have permission to update SEO settings.",
    };
  }

  const parsed = seoSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid SEO settings.");
  }

  const values: SeoSettingsFormValues = parsed.data;
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  // Always sync page list from Menu & Navigation (labels + paths).
  const navPaths = await loadStorefrontPathsFromNavigation();
  if (navPaths.length) {
    values.storefrontPaths = navPaths.map((p) => ({
      id: p.id,
      path: p.path,
      label: p.label,
      cmsSlug: p.cmsSlug || cmsSlugFromPath(p.path),
    }));
    values.sitemapPaths = syncSitemapRowsFromCatalog(
      values.sitemapPaths,
      values.storefrontPaths,
    );
  }

  const payload = {
    site_title: values.siteTitle.trim(),
    site_name: emptyToNull(values.siteName),
    meta_description: emptyToNull(values.metaDescription),
    keywords: parseKeywordsInput(values.keywords),
    canonical_url: emptyToNull(values.canonicalUrl),
    og_title: emptyToNull(values.ogTitle),
    og_description: emptyToNull(values.ogDescription),
    og_image_path: emptyToNull(values.ogImagePath ?? undefined),
    robots_index: values.robotsIndex,
    robots_follow: values.robotsFollow,
    google_site_verification: emptyToNull(values.googleSiteVerification),
    title_template: emptyToNull(values.titleTemplate),
    twitter_handle: emptyToNull(values.twitterHandle),
    page_seo: buildPageSeoPayload(values) as Json,
    schema_settings: buildSchemaSettingsPayload(values) as Json,
  };

  const { data: existing } = await supabase
    .from("store_seo_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  const write = existing
    ? await supabase
        .from("store_seo_settings")
        .update(payload)
        .eq("store_id", storeId)
    : await supabase.from("store_seo_settings").insert({
        store_id: storeId,
        ...payload,
      });

  if (write.error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "SEO_UPDATE",
      feature: "SEO",
      message: "Unable to save SEO settings",
      error: write.error,
      databaseCode: write.error.code,
      storeId,
      entityType: "store_seo_settings",
      entityId: storeId,
      route: SEO_ROUTE,
    });
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "SEO_SETTINGS_UPDATED",
    entity_type: "store_seo_settings",
    entity_id: storeId,
    metadata: {
      changed_fields: diffChangedKeys(
        (existing as Record<string, unknown> | null) ?? {},
        payload as Record<string, unknown>,
      ),
    },
  });

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "SEO_UPDATED",
    entity_type: "store_seo_settings",
    entity_id: storeId,
    metadata: {
      site_title: values.siteTitle,
      robots_index: values.robotsIndex,
    },
  });

  await publishStorefrontSync({
    storeId,
    topics: ["store.seo"],
  });
  return { ok: true, message: "SEO settings saved." };
}
