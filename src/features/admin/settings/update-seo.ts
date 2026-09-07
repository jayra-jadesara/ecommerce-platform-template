import "server-only";

import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import {
  parseKeywordsInput,
  seoSettingsSchema,
  type SeoSettingsFormValues,
} from "@/features/admin/settings/schemas";
import {
  resolveActiveStoreId,
  type SettingsUpdateResult,
} from "@/features/admin/settings/store-context";
import { diffChangedKeys } from "@/features/admin/settings/validation";
import { STOREFRONT_CONFIG_CACHE_TAG } from "@/features/theme/service";

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
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid SEO settings.",
    };
  }

  const values: SeoSettingsFormValues = parsed.data;
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const payload = {
    site_title: values.siteTitle.trim(),
    meta_description: emptyToNull(values.metaDescription),
    keywords: parseKeywordsInput(values.keywords),
    canonical_url: emptyToNull(values.canonicalUrl),
    og_title: emptyToNull(values.ogTitle),
    og_description: emptyToNull(values.ogDescription),
    og_image_path: emptyToNull(values.ogImagePath ?? undefined),
    robots_index: values.robotsIndex,
    robots_follow: values.robotsFollow,
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
    return {
      ok: false,
      error: "Unable to save SEO settings. Check permissions and try again.",
    };
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

  revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");
  return { ok: true, message: "SEO settings saved." };
}
