import "server-only";

import { revalidateTag } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
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
  formValuesToVisualEffectsDbRow,
} from "@/features/admin/theme/map-to-db";
import { STOREFRONT_CONFIG_CACHE_TAG } from "@/features/theme/service";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import type { FieldErrors } from "@/lib/validation";

export type ThemeUpdateResult =
  | { ok: true; message: string }
  | {
      ok: false;
      error: string;
      referenceId?: string;
      fieldErrors?: FieldErrors;
    };

const THEME_ROUTE = getAdminPath("/settings/theme");

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
 * Validates + persists theme/animation/visual-effects settings.
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
  const visualEffectsPayload = formValuesToVisualEffectsDbRow(values);

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

  const { data: existingVisualEffects } = await supabase
    .from("store_visual_effects_settings")
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
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "THEME_UPDATE",
      feature: "THEME",
      message: "Unable to save theme settings",
      error: themeWrite.error,
      databaseCode: themeWrite.error.code,
      storeId,
      entityType: "store_theme_settings",
      entityId: storeId,
      route: THEME_ROUTE,
    });
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
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "MOTION_3D_UPDATE",
      feature: "THEME",
      message: "Theme colors saved, but animation settings could not be updated",
      error: animationWrite.error,
      databaseCode: animationWrite.error.code,
      storeId,
      entityType: "store_animation_settings",
      entityId: storeId,
      route: THEME_ROUTE,
    });
  }

  const visualEffectsWrite = existingVisualEffects
    ? await supabase
        .from("store_visual_effects_settings")
        .update(visualEffectsPayload)
        .eq("store_id", storeId)
    : await supabase.from("store_visual_effects_settings").insert({
        store_id: storeId,
        ...visualEffectsPayload,
      });

  if (visualEffectsWrite.error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "MOTION_3D_UPDATE",
      feature: "THEME",
      message:
        "Theme saved, but 3D & visual effects settings could not be updated",
      error: visualEffectsWrite.error,
      databaseCode: visualEffectsWrite.error.code,
      storeId,
      entityType: "store_visual_effects_settings",
      entityId: storeId,
      route: THEME_ROUTE,
    });
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
    ...diffThemeKeys(
      (existingVisualEffects as Record<string, unknown> | null) ?? {},
      visualEffectsPayload as Record<string, unknown>,
    ).map((key) => `visualEffects.${key}`),
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

  const visualChanged = changedFields.some((key) =>
    key.startsWith("visualEffects."),
  );
  const motionChanged = changedFields.some(
    (key) =>
      key.startsWith("animation.") || key.startsWith("visualEffects."),
  );

  if (motionChanged) {
    await supabase.from("audit_logs").insert({
      store_id: storeId,
      user_id: admin.user.id,
      action: "MOTION_3D_SETTINGS_UPDATED",
      entity_type: "store_motion_3d_settings",
      entity_id: storeId,
      metadata: {
        changed_fields: changedFields.filter(
          (key) =>
            key.startsWith("animation.") || key.startsWith("visualEffects."),
        ),
        motion_enabled: values.animationEnabled,
        motion_intensity: values.animationIntensity,
        three_enabled: values.visual3dEnabled,
        mobile_3d: values.visual3dMobileEnabled,
        respect_reduced_motion: values.visual3dRespectReducedMotion,
      },
    });
  }

  if (visualChanged) {
    await supabase.from("audit_logs").insert({
      store_id: storeId,
      user_id: admin.user.id,
      action: "VISUAL_EFFECTS_UPDATED",
      entity_type: "store_visual_effects_settings",
      entity_id: storeId,
      metadata: {
        changed_fields: changedFields.filter((key) =>
          key.startsWith("visualEffects."),
        ),
        enabled: values.visual3dEnabled,
        hero_preset: values.visual3dHeroPreset,
        quality: values.visual3dQuality,
      },
    });
  }

  revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");

  return { ok: true, message: "Theme settings saved." };
}
