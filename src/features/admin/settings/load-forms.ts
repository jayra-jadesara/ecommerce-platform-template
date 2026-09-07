import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveActiveStore } from "@/features/admin/settings/store-context";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";
import {
  DEFAULT_BRANDING_SETTINGS,
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_HEADER_SETTINGS,
  DEFAULT_SEO_SETTINGS,
  type BrandingSettingsFormValues,
  type FooterSettingsFormValues,
  type GeneralSettingsFormValues,
  type HeaderSettingsFormValues,
  type SeoSettingsFormValues,
} from "@/features/admin/settings/schemas";
import type { Tables } from "@/types/database";

type SettingsRow = Tables<"store_settings">;
type BrandingRow = Tables<"store_branding">;
type SeoRow = Tables<"store_seo_settings">;

function text(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export async function loadGeneralSettingsForm(): Promise<{
  values: GeneralSettingsFormValues;
  storeId: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const store = await resolveActiveStore(supabase);
  if (!store) {
    return { values: DEFAULT_GENERAL_SETTINGS, storeId: null };
  }

  const { data } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", store.id)
    .maybeSingle();

  const row = data as SettingsRow | null;

  return {
    storeId: store.id,
    values: {
      displayName: store.name || DEFAULT_GENERAL_SETTINGS.displayName,
      legalName: text(store.legal_name),
      contactEmail: text(row?.contact_email),
      contactPhone: text(row?.contact_phone),
      contactPhoneSecondary: text(row?.contact_phone_secondary),
      addressLine1: text(row?.address_line_1),
      addressLine2: text(row?.address_line_2),
      city: text(row?.city),
      state: text(row?.state),
      postalCode: text(row?.postal_code),
      country: text(row?.country),
      currency: row?.currency || DEFAULT_GENERAL_SETTINGS.currency,
      timezone: row?.timezone || DEFAULT_GENERAL_SETTINGS.timezone,
      defaultLocale: row?.default_locale || DEFAULT_GENERAL_SETTINGS.defaultLocale,
      businessRegistrationNumber: text(row?.business_registration_number),
      taxId: text(row?.tax_id),
      registrationEnabled:
        row?.registration_enabled ?? DEFAULT_GENERAL_SETTINGS.registrationEnabled,
      checkoutGuestAllowed:
        row?.checkout_guest_allowed ??
        DEFAULT_GENERAL_SETTINGS.checkoutGuestAllowed,
      socialInstagram: text(row?.social_instagram),
      socialFacebook: text(row?.social_facebook),
      socialYoutube: text(row?.social_youtube),
      socialLinkedin: text(row?.social_linkedin),
      socialX: text(row?.social_x),
      socialWhatsapp: text(row?.social_whatsapp),
    },
  };
}

export async function loadBrandingSettingsForm(): Promise<{
  values: BrandingSettingsFormValues;
  previewUrls: {
    logoUrl?: string;
    logoDarkUrl?: string;
    faviconUrl?: string;
    socialImageUrl?: string;
  };
}> {
  const supabase = await createSupabaseServerClient();
  const store = await resolveActiveStore(supabase);
  if (!store) {
    return { values: DEFAULT_BRANDING_SETTINGS, previewUrls: {} };
  }

  const { data } = await supabase
    .from("store_branding")
    .select("*")
    .eq("store_id", store.id)
    .maybeSingle();

  const row = data as BrandingRow | null;
  const values: BrandingSettingsFormValues = {
    brandName: row?.brand_name || DEFAULT_BRANDING_SETTINGS.brandName,
    tagline: text(row?.tagline) || DEFAULT_BRANDING_SETTINGS.tagline || "",
    logoPath: row?.logo_path ?? null,
    logoDarkPath: row?.logo_dark_path ?? null,
    faviconPath: row?.favicon_path ?? null,
    socialSharingImagePath: row?.social_sharing_image_path ?? null,
  };

  return {
    values,
    previewUrls: {
      logoUrl: resolvePublicStorageUrl("branding", values.logoPath),
      logoDarkUrl: resolvePublicStorageUrl("branding", values.logoDarkPath),
      faviconUrl: resolvePublicStorageUrl("branding", values.faviconPath),
      socialImageUrl: resolvePublicStorageUrl(
        "branding",
        values.socialSharingImagePath,
      ),
    },
  };
}

export async function loadHeaderSettingsForm(): Promise<HeaderSettingsFormValues> {
  const supabase = await createSupabaseServerClient();
  const store = await resolveActiveStore(supabase);
  if (!store) return DEFAULT_HEADER_SETTINGS;

  const { data } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", store.id)
    .maybeSingle();

  const row = data as SettingsRow | null;
  return {
    stickyHeader: row?.header_sticky ?? DEFAULT_HEADER_SETTINGS.stickyHeader,
    searchEnabled:
      row?.header_search_enabled ?? DEFAULT_HEADER_SETTINGS.searchEnabled,
    cartEnabled: row?.header_cart_enabled ?? DEFAULT_HEADER_SETTINGS.cartEnabled,
    accountEnabled:
      row?.header_account_enabled ?? DEFAULT_HEADER_SETTINGS.accountEnabled,
    mobileMenuEnabled:
      row?.header_mobile_menu_enabled ??
      DEFAULT_HEADER_SETTINGS.mobileMenuEnabled,
    navVisible: row?.header_nav_visible ?? DEFAULT_HEADER_SETTINGS.navVisible,
    logoSize: row?.header_logo_size ?? DEFAULT_HEADER_SETTINGS.logoSize,
    announcementEnabled:
      row?.announcement_enabled ?? DEFAULT_HEADER_SETTINGS.announcementEnabled,
    announcementText: text(row?.announcement_text),
    announcementUrl: text(row?.announcement_url),
    announcementOpenInNewTab:
      row?.announcement_open_in_new_tab ??
      DEFAULT_HEADER_SETTINGS.announcementOpenInNewTab,
  };
}

export async function loadFooterSettingsForm(): Promise<FooterSettingsFormValues> {
  const supabase = await createSupabaseServerClient();
  const store = await resolveActiveStore(supabase);
  if (!store) return DEFAULT_FOOTER_SETTINGS;

  const { data } = await supabase
    .from("store_settings")
    .select("*")
    .eq("store_id", store.id)
    .maybeSingle();

  const row = data as SettingsRow | null;
  return {
    enabled: row?.footer_enabled ?? DEFAULT_FOOTER_SETTINGS.enabled,
    description: text(row?.footer_description),
    showContact: row?.footer_show_contact ?? DEFAULT_FOOTER_SETTINGS.showContact,
    showSocial: row?.footer_show_social ?? DEFAULT_FOOTER_SETTINGS.showSocial,
    showNewsletter:
      row?.footer_show_newsletter ?? DEFAULT_FOOTER_SETTINGS.showNewsletter,
    navVisible: row?.footer_nav_visible ?? DEFAULT_FOOTER_SETTINGS.navVisible,
    copyrightText: text(row?.copyright_text),
  };
}

export async function loadSeoSettingsForm(): Promise<{
  values: SeoSettingsFormValues;
  ogImageUrl?: string;
}> {
  const supabase = await createSupabaseServerClient();
  const store = await resolveActiveStore(supabase);
  if (!store) return { values: DEFAULT_SEO_SETTINGS };

  const { data } = await supabase
    .from("store_seo_settings")
    .select("*")
    .eq("store_id", store.id)
    .maybeSingle();

  const row = data as SeoRow | null;
  const values: SeoSettingsFormValues = {
    siteTitle: row?.site_title || DEFAULT_SEO_SETTINGS.siteTitle,
    metaDescription: text(row?.meta_description),
    keywords: (row?.keywords ?? []).join(", "),
    canonicalUrl: text(row?.canonical_url),
    ogTitle: text(row?.og_title),
    ogDescription: text(row?.og_description),
    ogImagePath: row?.og_image_path ?? null,
    robotsIndex: row?.robots_index ?? true,
    robotsFollow: row?.robots_follow ?? true,
  };

  return {
    values,
    ogImageUrl: resolvePublicStorageUrl("branding", values.ogImagePath),
  };
}
