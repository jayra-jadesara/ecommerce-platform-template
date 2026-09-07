import "server-only";

import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import {
  validateThemeEditorPayload,
  type ThemeEditorFormValues,
} from "@/features/admin/theme/editor-schema";
import {
  diffThemeKeys,
  formValuesToAnimationDbRow,
  formValuesToThemeDbRow,
} from "@/features/admin/theme/map-to-db";
import { STOREFRONT_CONFIG_CACHE_TAG } from "@/features/theme/service";

export type ThemeUpdateResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function getConfiguredStoreSlug(): string | null {
  const slug =
    process.env.STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "";
  return slug || null;
}

async function resolveActiveStoreId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<string | null> {
  const slug = getConfiguredStoreSlug();
  let query = supabase
    .from("stores")
    .select("id")
    .eq("status", "active")
    .limit(1);

  if (slug) {
    query = supabase
      .from("stores")
      .select("id")
      .eq("status", "active")
      .eq("slug", slug)
      .limit(1);
  }

  const { data, error } = await query;
  if (error || !data?.[0]) return null;
  return data[0].id;
}

/**
 * Validates + persists theme/animation settings.
 * Authorization: theme.update (SUPER_ADMIN / ADMIN via permissions + RLS).
 */
export async function updateStoreThemeSettings(
  input: unknown,
): Promise<ThemeUpdateResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "theme.update")) {
    return {
      ok: false,
      error: "You do not have permission to update the theme.",
    };
  }

  const validated = validateThemeEditorPayload(input);
  if (!validated.ok) return validated;

  const values: ThemeEditorFormValues = validated.data;
  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);

  if (!storeId) {
    return {
      ok: false,
      error: "No active store found. Create a store before editing the theme.",
    };
  }

  const themePayload = formValuesToThemeDbRow(values);
  const animationPayload = formValuesToAnimationDbRow(values);

  const { data: existingTheme } = await supabase
    .from("store_theme_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  const { data: existingAnimation } = await supabase
    .from("store_animation_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  const themeWrite = existingTheme
    ? await supabase
        .from("store_theme_settings")
        .update(themePayload)
        .eq("store_id", storeId)
    : await supabase.from("store_theme_settings").insert({
        store_id: storeId,
        ...themePayload,
      });

  if (themeWrite.error) {
    return {
      ok: false,
      error: "Unable to save theme settings. Check permissions and try again.",
    };
  }

  const animationWrite = existingAnimation
    ? await supabase
        .from("store_animation_settings")
        .update(animationPayload)
        .eq("store_id", storeId)
    : await supabase.from("store_animation_settings").insert({
        store_id: storeId,
        ...animationPayload,
      });

  if (animationWrite.error) {
    return {
      ok: false,
      error: "Theme colors saved, but animation settings could not be updated.",
    };
  }

  const changedFields = [
    ...diffThemeKeys(
      (existingTheme as Record<string, unknown> | null) ?? {},
      themePayload as Record<string, unknown>,
    ).map((key) => `theme.${key}`),
    ...diffThemeKeys(
      (existingAnimation as Record<string, unknown> | null) ?? {},
      animationPayload as Record<string, unknown>,
    ).map((key) => `animation.${key}`),
  ];

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "THEME_UPDATED",
    entity_type: "store_theme_settings",
    entity_id: storeId,
    metadata: {
      changed_fields: changedFields,
      default_mode: values.defaultMode,
      enabled_modes: values.enabledModes,
    },
  });

  revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");

  return { ok: true, message: "Theme settings saved." };
}
