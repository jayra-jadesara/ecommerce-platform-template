import "server-only";

import { revalidateTag } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import {
  generalSettingsSchema,
  type GeneralSettingsFormValues,
} from "@/features/admin/settings/schemas";
import {
  ensureActiveStore,
  type SettingsUpdateResult,
} from "@/features/admin/settings/store-context";
import { diffChangedKeys } from "@/features/admin/settings/validation";
import { STOREFRONT_CONFIG_CACHE_TAG } from "@/features/theme/service";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { zodValidationFailure } from "@/lib/validation";

const GENERAL_ROUTE = getAdminPath("/settings/general");

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function updateGeneralStoreSettings(
  input: unknown,
): Promise<SettingsUpdateResult> {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, "settings.update")) {
    return {
      ok: false,
      error: "You do not have permission to update store settings.",
    };
  }

  const parsed = generalSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid settings.");
  }

  const values: GeneralSettingsFormValues = parsed.data;
  const supabase = await createSupabaseServerClient();
  const ensured = await ensureActiveStore(supabase, {
    name: values.displayName,
    legalName: emptyToNull(values.legalName),
  });
  if ("error" in ensured) {
    return { ok: false, error: ensured.error };
  }
  const store = ensured;

  const settingsPayload = {
    contact_email: emptyToNull(values.contactEmail),
    contact_phone: emptyToNull(values.contactPhone),
    contact_phone_secondary: emptyToNull(values.contactPhoneSecondary),
    address_line_1: emptyToNull(values.addressLine1),
    address_line_2: emptyToNull(values.addressLine2),
    city: emptyToNull(values.city),
    state: emptyToNull(values.state),
    postal_code: emptyToNull(values.postalCode),
    country: emptyToNull(values.country),
    currency: values.currency,
    timezone: values.timezone,
    default_locale: values.defaultLocale,
    business_registration_number: emptyToNull(
      values.businessRegistrationNumber,
    ),
    tax_id: emptyToNull(values.taxId),
    registration_enabled: values.registrationEnabled,
    checkout_guest_allowed: values.checkoutGuestAllowed,
    social_instagram: emptyToNull(values.socialInstagram),
    social_facebook: emptyToNull(values.socialFacebook),
    social_youtube: emptyToNull(values.socialYoutube),
    social_linkedin: emptyToNull(values.socialLinkedin),
    social_x: emptyToNull(values.socialX),
    social_whatsapp: emptyToNull(values.socialWhatsapp),
  };

  const { data: existing } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", store.id)
    .maybeSingle();

  const storeWrite = await supabase
    .from("stores")
    .update({
      name: values.displayName,
      legal_name: emptyToNull(values.legalName),
    })
    .eq("id", store.id);

  if (storeWrite.error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "STORE_SETTINGS_UPDATE",
      feature: "SETTINGS",
      message: "Unable to update store profile",
      error: storeWrite.error,
      databaseCode: storeWrite.error.code,
      storeId: store.id,
      entityType: "stores",
      entityId: store.id,
      route: GENERAL_ROUTE,
    });
  }

  const settingsWrite = existing
    ? await supabase
        .from("store_settings")
        .update(settingsPayload)
        .eq("store_id", store.id)
    : await supabase.from("store_settings").insert({
        store_id: store.id,
        ...settingsPayload,
      });

  if (settingsWrite.error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "STORE_SETTINGS_UPDATE",
      feature: "SETTINGS",
      message: "Unable to save store settings",
      error: settingsWrite.error,
      databaseCode: settingsWrite.error.code,
      storeId: store.id,
      entityType: "store_settings",
      entityId: store.id,
      route: GENERAL_ROUTE,
    });
  }

  const changed = [
    ...diffChangedKeys(
      { name: store.name, legal_name: store.legal_name },
      { name: values.displayName, legal_name: emptyToNull(values.legalName) },
    ).map((key) => `store.${key}`),
    ...diffChangedKeys(
      (existing as Record<string, unknown> | null) ?? {},
      settingsPayload as Record<string, unknown>,
    ).map((key) => `settings.${key}`),
  ];

  await supabase.from("audit_logs").insert({
    store_id: store.id,
    user_id: admin.user.id,
    action: "STORE_SETTINGS_UPDATED",
    entity_type: "store_settings",
    entity_id: store.id,
    metadata: { changed_fields: changed },
  });

  revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");
  return { ok: true, message: "Store settings saved." };
}
