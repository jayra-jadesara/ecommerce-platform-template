import "server-only";

import { revalidateTag } from "next/cache";
import { getAdminPath } from "@/config/admin-route";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import {
  contactContentSchema,
  type ContactContentFormValues,
} from "@/features/admin/settings/contact-content-schema";
import {
  ensureActiveStore,
  type SettingsUpdateResult,
} from "@/features/admin/settings/store-context";
import { STOREFRONT_CONFIG_CACHE_TAG } from "@/features/theme/service";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { zodValidationFailure } from "@/lib/validation";

const CONTACT_CONTENT_ROUTE = getAdminPath("/content/contact");

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function updateContactContentSettings(
  input: unknown,
): Promise<SettingsUpdateResult> {
  const admin = await getCurrentAdmin();
  if (
    !admin ||
    !(
      hasPermission(admin, "content.update") ||
      hasPermission(admin, "settings.update")
    )
  ) {
    return {
      ok: false,
      error: "You do not have permission to update the contact page.",
    };
  }

  const parsed = contactContentSchema.safeParse(input);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid contact page settings.");
  }

  const values: ContactContentFormValues = parsed.data;
  const supabase = await createSupabaseServerClient();
  const ensured = await ensureActiveStore(supabase, {});
  if ("error" in ensured) {
    return { ok: false, error: ensured.error };
  }
  const store = ensured;

  const payload = {
    contact_email: emptyToNull(values.contactEmail),
    contact_phone: emptyToNull(
      values.contactPhone.replace(/\D/g, "").slice(0, 10),
    ),
    contact_phone_secondary: emptyToNull(
      values.contactPhoneSecondary.replace(/\D/g, "").slice(0, 10),
    ),
    address_line_1: emptyToNull(values.addressLine1),
    address_line_2: emptyToNull(values.addressLine2),
    city: emptyToNull(values.city),
    state: emptyToNull(values.state),
    postal_code: emptyToNull(values.postalCode),
    country: emptyToNull(values.country),
    contact_banner_enabled: values.contactBannerEnabled,
    contact_banner_image_path: values.contactBannerImagePath,
    contact_spotlight_enabled: values.contactSpotlightEnabled,
    contact_spotlight_image_path: values.contactSpotlightImagePath,
    contact_page_heading: emptyToNull(values.contactPageHeading),
    contact_page_support: emptyToNull(values.contactPageSupport),
    contact_map_enabled: values.contactMapEnabled,
    contact_map_embed_url: emptyToNull(values.contactMapEmbedUrl ?? undefined),
  };

  const { data: existing } = await supabase
    .from("store_settings")
    .select("store_id")
    .eq("store_id", store.id)
    .maybeSingle();

  const write = existing
    ? await supabase
        .from("store_settings")
        .update(payload)
        .eq("store_id", store.id)
    : await supabase.from("store_settings").insert({
        store_id: store.id,
        ...payload,
      });

  if (write.error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "STORE_SETTINGS_UPDATE",
      feature: "SETTINGS",
      message: "Unable to update contact page",
      error: write.error,
      route: CONTACT_CONTENT_ROUTE,
    });
  }

  revalidateTag(STOREFRONT_CONFIG_CACHE_TAG, "max");
  return { ok: true, message: "Contact page saved." };
}
