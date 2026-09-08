import "server-only";

import { unstable_cache } from "next/cache";
import { defaultPlatformConfig } from "@/config/defaults";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import {
  mapAnimationRowToConfig,
  mapBrandingRowToConfig,
  mapNavigationRowsToConfig,
  mapSeoRowToConfig,
  mapSettingsRowToContact,
  mapSettingsRowToFooter,
  mapSettingsRowToHeader,
  mapSettingsRowToSocial,
  mapSettingsRowToStore,
  mapThemeRowToConfig,
  type AnimationRow,
  type BrandingRow,
  type NavRow,
  type SeoRow,
  type SettingsRow,
  type ThemeRow,
} from "@/features/theme/map-from-db";
import type {
  AnimationConfig,
  BrandConfig,
  ContactConfig,
  FooterChromeConfig,
  HeaderChromeConfig,
  NavigationConfig,
  PlatformConfig,
  SeoConfig,
  SocialLinksConfig,
  StoreConfig,
  ThemeConfig,
} from "@/types";

export const STOREFRONT_CONFIG_CACHE_TAG = "storefront-config";

function getConfiguredStoreSlug(): string | null {
  const slug =
    process.env.STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "";
  return slug || null;
}

async function loadStorefrontConfigUncached(): Promise<PlatformConfig> {
  const fallback = structuredClone(defaultPlatformConfig);
  const supabase = createSupabasePublicClient();
  if (!supabase) return fallback;

  const slug = getConfiguredStoreSlug();

  let storeQuery = supabase
    .from("stores")
    .select("id, slug, status, name, legal_name")
    .eq("status", "active")
    .limit(1);

  if (slug) {
    storeQuery = supabase
      .from("stores")
      .select("id, slug, status, name, legal_name")
      .eq("status", "active")
      .eq("slug", slug)
      .limit(1);
  }

  const { data: stores, error: storeError } = await storeQuery;
  if (storeError || !stores?.[0]) return fallback;

  const store = stores[0];
  const storeId = store.id;

  const [
    brandingResult,
    themeResult,
    animationResult,
    seoResult,
    settingsResult,
    navResult,
  ] = await Promise.all([
    supabase.from("store_branding").select("*").eq("store_id", storeId).maybeSingle(),
    supabase
      .from("store_theme_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("store_animation_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase
      .from("store_seo_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle(),
    supabase.from("store_settings").select("*").eq("store_id", storeId).maybeSingle(),
    supabase
      .from("navigation_items")
      .select(
        "id, location, parent_id, label, href, sort_order, is_active, open_in_new_tab",
      )
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const settings = settingsResult.data as SettingsRow | null;
  const brand = mapBrandingRowToConfig(
    brandingResult.data as BrandingRow | null,
  );
  const theme = mapThemeRowToConfig(themeResult.data as ThemeRow | null);
  const animation = mapAnimationRowToConfig(
    animationResult.data as AnimationRow | null,
  );
  const seo = mapSeoRowToConfig(seoResult.data as SeoRow | null, brand.name);
  const navigation = mapNavigationRowsToConfig(
    (navResult.data as NavRow[] | null) ?? null,
  );
  const header = mapSettingsRowToHeader(settings);
  const footer = mapSettingsRowToFooter(settings);
  const contact = mapSettingsRowToContact(settings);
  const social = mapSettingsRowToSocial(settings);
  const storeConfig = mapSettingsRowToStore(
    settings,
    store.name,
    store.legal_name,
  );

  return {
    ...fallback,
    brand,
    theme,
    animation,
    navigation,
    seo: {
      ...seo,
      ogImage: seo.ogImage ?? brand.socialImageUrl,
    },
    typography: {
      ...fallback.typography,
      fontSans: themeResult.data?.font_sans || fallback.typography.fontSans,
      fontMono: themeResult.data?.font_mono || fallback.typography.fontMono,
      fontDisplay:
        themeResult.data?.font_display || fallback.typography.fontDisplay,
    },
    layout: {
      ...fallback.layout,
      maxWidth: "100%",
      containerPadding: "0.75rem",
      stickyHeader: header.sticky,
      footerVariant: footer.description ? "detailed" : "simple",
    },
    store: storeConfig,
    contact,
    social,
    header,
    footer,
  };
}

/**
 * Cached storefront platform config (theme, branding, settings, SEO, nav).
 * Invalidate with revalidateTag('storefront-config') after Admin edits.
 */
export const getStorefrontPlatformConfig = unstable_cache(
  loadStorefrontConfigUncached,
  ["storefront-platform-config"],
  {
    revalidate: 60,
    tags: [STOREFRONT_CONFIG_CACHE_TAG],
  },
);

/** Alias used by Phase 6 settings consumers. */
export const getStorefrontGlobalConfig = getStorefrontPlatformConfig;

export async function getStoreTheme(): Promise<ThemeConfig> {
  const config = await getStorefrontPlatformConfig();
  return config.theme;
}

export async function getStoreBranding(): Promise<BrandConfig> {
  const config = await getStorefrontPlatformConfig();
  return config.brand;
}

export async function getStoreAnimation(): Promise<AnimationConfig> {
  const config = await getStorefrontPlatformConfig();
  return config.animation;
}

export async function getStoreSettings(): Promise<StoreConfig> {
  const config = await getStorefrontPlatformConfig();
  return config.store;
}

export async function getStoreSeo(): Promise<SeoConfig> {
  const config = await getStorefrontPlatformConfig();
  return config.seo;
}

export async function getStoreNavigation(): Promise<NavigationConfig> {
  const config = await getStorefrontPlatformConfig();
  return config.navigation;
}

export async function getStoreContact(): Promise<ContactConfig> {
  const config = await getStorefrontPlatformConfig();
  return config.contact;
}

export async function getStoreSocial(): Promise<SocialLinksConfig> {
  const config = await getStorefrontPlatformConfig();
  return config.social;
}

export async function getStoreHeader(): Promise<HeaderChromeConfig> {
  const config = await getStorefrontPlatformConfig();
  return config.header;
}

export async function getStoreFooter(): Promise<FooterChromeConfig> {
  const config = await getStorefrontPlatformConfig();
  return config.footer;
}
