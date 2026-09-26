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
  flattenPageSeo,
  flattenSchemaSettings,
  type BrandingSettingsFormValues,
  type FooterSettingsFormValues,
  type GeneralSettingsFormValues,
  type HeaderSettingsFormValues,
  type SeoSettingsFormValues,
} from "@/features/admin/settings/schemas";
import type { Tables } from "@/types/database";
import { whatsappDisplayValue } from "@/features/admin/settings/validation";
import type { PageSeoSourceInfo } from "@/features/admin/settings/seo-page-sources";
import {
  resolveAdminStorefrontPaths,
} from "@/features/seo/storefront-paths.server";
import {
  buildDefaultSitemapPaths,
  syncSitemapRowsFromCatalog,
} from "@/features/seo/sitemap-paths";

export type { PageSeoSourceInfo };
import {
  coerceAdminImageMaxMb,
  coerceAdminReelVideoMaxMb,
} from "@/features/media/upload-limits";
import {
  coerceStorefrontLoaderLabel,
  coerceStorefrontLoaderStyle,
} from "@/components/ui/storefront-loader";
import {
  normalizeNationalPhone,
  normalizePhoneCountryCode,
} from "@/lib/phone";

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
      contactPhone: normalizeNationalPhone(row?.contact_phone),
      contactPhoneSecondary: normalizeNationalPhone(
        row?.contact_phone_secondary,
      ),
      addressLine1: text(row?.address_line_1),
      addressLine2: text(row?.address_line_2),
      city: text(row?.city),
      state: text(row?.state),
      postalCode: text(row?.postal_code),
      country: text(row?.country),
      phoneCountryCode: normalizePhoneCountryCode(row?.phone_country_code),
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
      socialWhatsapp: whatsappDisplayValue(
        text(row?.social_whatsapp),
        normalizePhoneCountryCode(row?.phone_country_code),
      ),
      whatsappFloatEnabled: Boolean(row?.whatsapp_float_enabled),
      adminImageMaxMb: coerceAdminImageMaxMb(row?.admin_image_max_mb),
      adminReelVideoMaxMb: coerceAdminReelVideoMaxMb(
        row?.admin_reel_video_max_mb,
      ),
      contactBannerEnabled: Boolean(row?.contact_banner_enabled),
      contactBannerImagePath: row?.contact_banner_image_path?.trim() || null,
      contactSpotlightEnabled: Boolean(row?.contact_spotlight_enabled),
      contactSpotlightImagePath:
        row?.contact_spotlight_image_path?.trim() || null,
      contactPageHeading:
        row?.contact_page_heading?.trim() ||
        DEFAULT_GENERAL_SETTINGS.contactPageHeading,
      contactPageSupport:
        row?.contact_page_support?.trim() ||
        DEFAULT_GENERAL_SETTINGS.contactPageSupport,
      contactMapEnabled: row?.contact_map_enabled !== false,
      contactMapEmbedUrl: row?.contact_map_embed_url?.trim() || null,
      storefrontLoaderStyle: coerceStorefrontLoaderStyle(
        row?.storefront_loader_style,
      ),
      storefrontLoaderLabel: coerceStorefrontLoaderLabel(
        row?.storefront_loader_label,
      ),
      orderNumberPrefix:
        row?.order_number_prefix?.trim() ||
        DEFAULT_GENERAL_SETTINGS.orderNumberPrefix,
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
    productsCategoryMenu:
      row?.header_products_category_menu ??
      DEFAULT_HEADER_SETTINGS.productsCategoryMenu,
    logoSize: row?.header_logo_size ?? DEFAULT_HEADER_SETTINGS.logoSize,
    logoHang: row?.header_logo_hang ?? DEFAULT_HEADER_SETTINGS.logoHang,
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
    showLogo: row?.footer_show_logo ?? DEFAULT_FOOTER_SETTINGS.showLogo,
    navVisible: row?.footer_nav_visible ?? DEFAULT_FOOTER_SETTINGS.navVisible,
    copyrightText: "",
    showFeaturedProduct: false,
    featuredProductId: null,
  };
}

export async function loadSeoSettingsForm(): Promise<{
  values: SeoSettingsFormValues;
  ogImageUrl?: string;
  storeDisplayName: string;
  sitemapUrl: string;
  missingProductSeoCount: number;
  pageSources: PageSeoSourceInfo[];
}> {
  const supabase = await createSupabaseServerClient();
  const store = await resolveActiveStore(supabase);
  const storeDisplayName = store?.name?.trim() || "";

  if (!store) {
    return {
      values: {
        ...DEFAULT_SEO_SETTINGS,
        siteTitle: storeDisplayName || DEFAULT_SEO_SETTINGS.siteTitle,
      },
      storeDisplayName,
      sitemapUrl: "",
      missingProductSeoCount: 0,
      pageSources: [],
    };
  }

  const { data } = await supabase
    .from("store_seo_settings")
    .select("*")
    .eq("store_id", store.id)
    .maybeSingle();

  const row = data as SeoRow | null;
  const pageFields = flattenPageSeo(
    (row as { page_seo?: unknown } | null)?.page_seo,
  );
  const schemaFields = flattenSchemaSettings(
    (row as { schema_settings?: unknown } | null)?.schema_settings,
  );

  const values: SeoSettingsFormValues = {
    siteTitle: row?.site_title?.trim() || storeDisplayName,
    siteName: text(
      (row as { site_name?: string | null } | null)?.site_name,
    ),
    metaDescription: text(row?.meta_description),
    keywords: (row?.keywords ?? []).join(", "),
    canonicalUrl: text(row?.canonical_url),
    ogTitle: text(row?.og_title),
    ogDescription: text(row?.og_description),
    ogImagePath: row?.og_image_path ?? null,
    robotsIndex: row?.robots_index ?? true,
    robotsFollow: row?.robots_follow ?? true,
    googleSiteVerification: text(
      (row as { google_site_verification?: string | null } | null)
        ?.google_site_verification,
    ),
    titleTemplate: text(
      (row as { title_template?: string | null } | null)?.title_template,
    ),
    twitterHandle: text(
      (row as { twitter_handle?: string | null } | null)?.twitter_handle,
    ),
    ...schemaFields,
    ...pageFields,
  };

  // Pages + labels come from Menu & Navigation — not edited on this form.
  const navPaths = await resolveAdminStorefrontPaths();
  values.storefrontPaths = navPaths.map((p) => ({ ...p }));
  values.sitemapPaths = syncSitemapRowsFromCatalog(
    values.sitemapPaths.length
      ? values.sitemapPaths
      : buildDefaultSitemapPaths(navPaths),
    navPaths,
  );

  const [{ count }, { data: cmsPages }, { data: settingsRow }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("status", "active")
        .or("seo_title.is.null,seo_title.eq."),
      supabase
        .from("pages")
        .select("slug, title, seo_title, seo_description")
        .eq("store_id", store.id)
        .in("slug", [
          "about",
          "career",
          "privacy",
          "terms",
          "disclaimer",
          "products",
          "blog",
        ]),
      supabase
        .from("store_settings")
        .select(
          "contact_page_heading, contact_page_support, brochure_page_description",
        )
        .eq("store_id", store.id)
        .maybeSingle(),
    ]);

  const bySlug = new Map(
    (cmsPages ?? []).map((p) => [p.slug as string, p] as const),
  );
  const pageTitle = (slug: string, fallback: string) => {
    const p = bySlug.get(slug);
    return (
      p?.seo_title?.trim() ||
      p?.title?.trim() ||
      fallback
    );
  };
  const pageDesc = (slug: string) => {
    const p = bySlug.get(slug);
    return p?.seo_description?.trim() || "";
  };
  const contactHeading =
    (settingsRow as { contact_page_heading?: string | null } | null)
      ?.contact_page_heading?.trim() || "";
  const contactSupport =
    (settingsRow as { contact_page_support?: string | null } | null)
      ?.contact_page_support?.trim() || "";
  const brochureIntro =
    (settingsRow as { brochure_page_description?: string | null } | null)
      ?.brochure_page_description?.trim() || "";

  const pageSources: PageSeoSourceInfo[] = [
    {
      key: "about",
      label: "About",
      path: "/about",
      sourceTitle: pageTitle("about", `About ${storeDisplayName}`),
      sourceDescription: pageDesc("about"),
      sourceHint: "From Content → About",
    },
    {
      key: "contact",
      label: "Contact",
      path: "/contact",
      sourceTitle: contactHeading || `Contact ${storeDisplayName}`,
      sourceDescription: contactSupport,
      sourceHint: "From Store Information → Contact page",
    },
    {
      key: "career",
      label: "Career",
      path: "/career",
      sourceTitle: pageTitle("career", `Careers at ${storeDisplayName}`),
      sourceDescription: pageDesc("career"),
      sourceHint: "From Content → Career",
    },
    {
      key: "products",
      label: "Products",
      path: "/products",
      sourceTitle: pageTitle("products", "Products"),
      sourceDescription: pageDesc("products") || values.metaDescription,
      sourceHint: "From catalog listing (or store description)",
    },
    {
      key: "blog",
      label: "Blog",
      path: "/blog",
      sourceTitle: pageTitle("blog", "Blog"),
      sourceDescription: pageDesc("blog") || values.metaDescription,
      sourceHint: "From Blog settings / store description",
    },
    {
      key: "brochure",
      label: "Brochure",
      path: "/brochure",
      sourceTitle: "Brochure",
      sourceDescription: brochureIntro || values.metaDescription,
      sourceHint: "From Content → Brochures (page description)",
    },
    {
      key: "privacy",
      label: "Privacy",
      path: "/privacy",
      sourceTitle: pageTitle("privacy", "Privacy Policy"),
      sourceDescription: pageDesc("privacy"),
      sourceHint: "From Content → Legal pages",
    },
    {
      key: "terms",
      label: "Terms",
      path: "/terms",
      sourceTitle: pageTitle("terms", "Terms of Use"),
      sourceDescription: pageDesc("terms"),
      sourceHint: "From Content → Legal pages",
    },
    {
      key: "disclaimer",
      label: "Disclaimer",
      path: "/disclaimer",
      sourceTitle: pageTitle("disclaimer", "Disclaimer"),
      sourceDescription: pageDesc("disclaimer"),
      sourceHint: "From Content → Legal pages",
    },
  ];

  const origin =
    (values.canonicalUrl ?? "").trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";
  const sitemapUrl = origin
    ? `${origin.replace(/\/$/, "")}/sitemap.xml`
    : "/sitemap.xml";

  return {
    values,
    ogImageUrl: resolvePublicStorageUrl("branding", values.ogImagePath),
    storeDisplayName,
    sitemapUrl,
    missingProductSeoCount: count ?? 0,
    pageSources,
  };
}
