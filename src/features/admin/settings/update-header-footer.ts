import "server-only";

import { revalidateTag } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import {
  footerSettingsSchema,
  headerSettingsSchema,
  type FooterSettingsFormValues,
  type HeaderSettingsFormValues,
} from "@/features/admin/settings/schemas";
import {
  resolveActiveStoreId,
  type SettingsUpdateResult,
} from "@/features/admin/settings/store-context";
import { diffChangedKeys } from "@/features/admin/settings/validation";
import { STOREFRONT_CONFIG_CACHE_TAG } from "@/features/theme/service";
import type { Database } from "@/types/database";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";

type StoreSettingsUpdate = Database["public"]["Tables"]["store_settings"]["Update"];

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function upsertSettingsPartial(
  permission: "settings.update",
  auditAction: "HEADER_SETTINGS_UPDATED" | "FOOTER_SETTINGS_UPDATED",
  operation: "HEADER_SETTINGS_UPDATE" | "FOOTER_SETTINGS_UPDATE",
  route: string,
  payload: StoreSettingsUpdate,
  successMessage: string,
): Promise<SettingsUpdateResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, permission)) {
    return {
      ok: false,
      error: "You do not have permission to update these settings.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const { data: existing } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  const write = existing
    ? await supabase
        .from("store_settings")
        .update(payload)
        .eq("store_id", storeId)
    : await supabase.from("store_settings").insert({
        store_id: storeId,
        currency: "INR",
        timezone: "UTC",
        ...payload,
      });

  if (write.error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation,
      feature: "SETTINGS",
      message: "Unable to save settings",
      error: write.error,
      databaseCode: write.error.code,
      storeId,
      entityType: "store_settings",
      entityId: storeId,
      route,
    });
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: auditAction,
    entity_type: "store_settings",
    entity_id: storeId,
    metadata: {
      changed_fields: diffChangedKeys(
        (existing as Record<string, unknown> | null) ?? {},
        payload as Record<string, unknown>,
      ),
    },
  });

  revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");
  return { ok: true, message: successMessage };
}

export async function updateHeaderSettings(
  input: unknown,
): Promise<SettingsUpdateResult> {
  const parsed = headerSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid header settings.",
    };
  }

  const values: HeaderSettingsFormValues = parsed.data;
  return upsertSettingsPartial(
    "settings.update",
    "HEADER_SETTINGS_UPDATED",
    "HEADER_SETTINGS_UPDATE",
    getAdminPath("/settings/header"),
    {
      header_sticky: values.stickyHeader,
      header_search_enabled: values.searchEnabled,
      header_cart_enabled: values.cartEnabled,
      header_account_enabled: values.accountEnabled,
      header_mobile_menu_enabled: values.mobileMenuEnabled,
      header_nav_visible: values.navVisible,
      header_logo_size: values.logoSize,
      announcement_enabled: values.announcementEnabled,
      announcement_text: emptyToNull(values.announcementText),
      announcement_url: emptyToNull(values.announcementUrl),
      announcement_open_in_new_tab: values.announcementOpenInNewTab,
    },
    "Header settings saved.",
  );
}

export async function updateFooterSettings(
  input: unknown,
): Promise<SettingsUpdateResult> {
  const parsed = footerSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid footer settings.",
    };
  }

  const values: FooterSettingsFormValues = parsed.data;
  return upsertSettingsPartial(
    "settings.update",
    "FOOTER_SETTINGS_UPDATED",
    "FOOTER_SETTINGS_UPDATE",
    getAdminPath("/settings/footer"),
    {
      footer_enabled: values.enabled,
      footer_description: emptyToNull(values.description),
      footer_show_contact: values.showContact,
      footer_show_social: values.showSocial,
      footer_show_newsletter: values.showNewsletter,
      footer_nav_visible: values.navVisible,
      copyright_text: emptyToNull(values.copyrightText),
    },
    "Footer settings saved.",
  );
}
