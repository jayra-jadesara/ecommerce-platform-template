import type {
  AnimationConfig,
  BrandConfig,
  ColorTokens,
  ContactConfig,
  FooterChromeConfig,
  HeaderChromeConfig,
  LogoSize,
  NavItem,
  NavigationConfig,
  SeoConfig,
  SocialLinksConfig,
  StoreConfig,
  ThemeConfig,
  ThemeMode,
} from "@/types";
import {
  coerceAnimationIntensity,
  coerceAnimationPreset,
  coerceThemeMode,
  completeColorTokens,
  parseAnimationConfig,
  parseThemeConfig,
} from "@/features/theme/validation";
import { defaultPlatformConfig } from "@/config/defaults";
import { resolvePublicStorageUrl } from "@/lib/supabase/storage-url";

export type ThemeRow = {
  default_mode: string;
  enabled_modes: string[] | null;
  allow_user_toggle: boolean;
  light_primary: string;
  light_secondary: string;
  light_accent: string;
  light_background: string;
  light_foreground: string;
  light_surface: string;
  light_card: string;
  light_border: string;
  light_muted: string;
  light_success: string;
  light_warning: string;
  light_error: string;
  light_header_background?: string | null;
  light_header_foreground?: string | null;
  light_footer_background?: string | null;
  light_footer_foreground?: string | null;
  light_button_background?: string | null;
  light_button_foreground?: string | null;
  dark_primary: string;
  dark_secondary: string;
  dark_accent: string;
  dark_background: string;
  dark_foreground: string;
  dark_surface: string;
  dark_card: string;
  dark_border: string;
  dark_muted: string;
  dark_success: string;
  dark_warning: string;
  dark_error: string;
  dark_header_background?: string | null;
  dark_header_foreground?: string | null;
  dark_footer_background?: string | null;
  dark_footer_foreground?: string | null;
  dark_button_background?: string | null;
  dark_button_foreground?: string | null;
  border_radius?: string | null;
};

export type BrandingRow = {
  brand_name: string;
  tagline: string | null;
  logo_path: string | null;
  logo_dark_path: string | null;
  favicon_path: string | null;
  social_sharing_image_path: string | null;
};

export type AnimationRow = {
  enabled: boolean;
  preset: string;
  intensity: string;
};

export type SeoRow = {
  site_title: string;
  meta_description: string | null;
  keywords: string[] | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_path: string | null;
  robots_index: boolean;
  robots_follow: boolean;
};

export type NavRow = {
  id?: string;
  location: "header" | "footer";
  parent_id?: string | null;
  label: string;
  href: string;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
};

export type SettingsRow = {
  contact_email: string | null;
  contact_phone: string | null;
  contact_phone_secondary?: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  currency: string;
  timezone: string;
  default_locale?: string | null;
  registration_enabled?: boolean | null;
  checkout_guest_allowed?: boolean | null;
  social_instagram?: string | null;
  social_facebook?: string | null;
  social_youtube?: string | null;
  social_linkedin?: string | null;
  social_x?: string | null;
  social_whatsapp?: string | null;
  header_sticky?: boolean | null;
  header_search_enabled?: boolean | null;
  header_cart_enabled?: boolean | null;
  header_account_enabled?: boolean | null;
  header_mobile_menu_enabled?: boolean | null;
  header_nav_visible?: boolean | null;
  header_logo_size?: string | null;
  announcement_enabled?: boolean | null;
  announcement_text?: string | null;
  announcement_url?: string | null;
  announcement_open_in_new_tab?: boolean | null;
  footer_enabled?: boolean | null;
  footer_description?: string | null;
  footer_show_contact?: boolean | null;
  footer_show_social?: boolean | null;
  footer_show_newsletter?: boolean | null;
  footer_nav_visible?: boolean | null;
  copyright_text?: string | null;
};

function mapLightPalette(row: ThemeRow): ColorTokens | null {
  return completeColorTokens(
    {
      primary: row.light_primary,
      secondary: row.light_secondary,
      accent: row.light_accent,
      background: row.light_background,
      foreground: row.light_foreground,
      surface: row.light_surface,
      card: row.light_card,
      border: row.light_border,
      muted: row.light_muted,
      success: row.light_success,
      warning: row.light_warning,
      error: row.light_error,
      headerBackground: row.light_header_background ?? undefined,
      headerForeground: row.light_header_foreground ?? undefined,
      footerBackground: row.light_footer_background ?? undefined,
      footerForeground: row.light_footer_foreground ?? undefined,
      buttonBackground: row.light_button_background ?? undefined,
      buttonForeground: row.light_button_foreground ?? undefined,
    },
    "#ffffff",
  );
}

function mapDarkPalette(row: ThemeRow): ColorTokens | null {
  return completeColorTokens(
    {
      primary: row.dark_primary,
      secondary: row.dark_secondary,
      accent: row.dark_accent,
      background: row.dark_background,
      foreground: row.dark_foreground,
      surface: row.dark_surface,
      card: row.dark_card,
      border: row.dark_border,
      muted: row.dark_muted,
      success: row.dark_success,
      warning: row.dark_warning,
      error: row.dark_error,
      headerBackground: row.dark_header_background ?? undefined,
      headerForeground: row.dark_header_foreground ?? undefined,
      footerBackground: row.dark_footer_background ?? undefined,
      footerForeground: row.dark_footer_foreground ?? undefined,
      buttonBackground: row.dark_button_background ?? undefined,
      buttonForeground: row.dark_button_foreground ?? undefined,
    },
    "#0f1412",
  );
}

export function mapThemeRowToConfig(row: ThemeRow | null | undefined): ThemeConfig {
  if (!row) return defaultPlatformConfig.theme;

  const light = mapLightPalette(row);
  const dark = mapDarkPalette(row);
  if (!light || !dark) return defaultPlatformConfig.theme;

  const enabledModes = (row.enabled_modes ?? [])
    .map((mode) => coerceThemeMode(mode, "light"))
    .filter((mode, index, all): mode is ThemeMode => all.indexOf(mode) === index);

  const defaultMode = coerceThemeMode(row.default_mode, "light");
  const normalizedEnabled =
    enabledModes.length > 0
      ? enabledModes.includes(defaultMode)
        ? enabledModes
        : [defaultMode, ...enabledModes]
      : [defaultMode];

  const candidate: ThemeConfig = {
    defaultMode,
    allowUserToggle: Boolean(row.allow_user_toggle),
    enabledModes: normalizedEnabled,
    light,
    dark,
    borderRadius: row.border_radius ?? undefined,
  };

  return parseThemeConfig(candidate) ?? defaultPlatformConfig.theme;
}

export function mapBrandingRowToConfig(
  row: BrandingRow | null | undefined,
): BrandConfig {
  if (!row?.brand_name?.trim()) {
    return defaultPlatformConfig.brand;
  }

  return {
    name: row.brand_name.trim(),
    tagline: row.tagline?.trim() || undefined,
    logoUrl: resolvePublicStorageUrl("branding", row.logo_path),
    logoDarkUrl: resolvePublicStorageUrl("branding", row.logo_dark_path),
    faviconUrl: resolvePublicStorageUrl("branding", row.favicon_path),
    socialImageUrl: resolvePublicStorageUrl(
      "branding",
      row.social_sharing_image_path,
    ),
    logoAlt: `${row.brand_name.trim()} logo`,
  };
}

export function mapAnimationRowToConfig(
  row: AnimationRow | null | undefined,
): AnimationConfig {
  if (!row) return defaultPlatformConfig.animation;

  const candidate: AnimationConfig = {
    enabled: Boolean(row.enabled),
    defaultPreset: coerceAnimationPreset(row.preset, "fade-up"),
    intensity: coerceAnimationIntensity(row.intensity, "medium"),
  };

  return parseAnimationConfig(candidate) ?? defaultPlatformConfig.animation;
}

export function mapSeoRowToConfig(
  row: SeoRow | null | undefined,
  brandName: string,
): SeoConfig {
  if (!row?.site_title?.trim()) {
    return {
      ...defaultPlatformConfig.seo,
      title: brandName,
      titleTemplate: `%s | ${brandName}`,
      siteName: brandName,
    };
  }

  return {
    title: row.site_title.trim(),
    titleTemplate: `%s | ${row.site_title.trim()}`,
    description:
      row.meta_description?.trim() || defaultPlatformConfig.seo.description,
    keywords: row.keywords?.filter(Boolean) ?? undefined,
    canonicalUrl: row.canonical_url?.trim() || undefined,
    ogTitle: row.og_title?.trim() || undefined,
    ogDescription: row.og_description?.trim() || undefined,
    ogImage:
      resolvePublicStorageUrl("branding", row.og_image_path) || undefined,
    siteName: row.og_title?.trim() || row.site_title.trim(),
    robotsIndex: row.robots_index ?? true,
    robotsFollow: row.robots_follow ?? true,
  };
}

function toNavItem(row: NavRow): NavItem {
  return {
    label: row.label,
    href: row.href,
    external: row.open_in_new_tab,
  };
}

export function mapNavigationRowsToConfig(
  rows: NavRow[] | null | undefined,
): NavigationConfig {
  if (!rows?.length) return defaultPlatformConfig.navigation;

  const active = rows
    .filter((row) => row.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  function buildTree(location: "header" | "footer"): NavItem[] {
    const scoped = active.filter((row) => row.location === location);
    const byId = new Map(
      scoped.filter((row) => row.id).map((row) => [row.id as string, row]),
    );
    const childrenByParent = new Map<string, NavRow[]>();

    for (const row of scoped) {
      if (!row.parent_id || !byId.has(row.parent_id)) continue;
      const list = childrenByParent.get(row.parent_id) ?? [];
      list.push(row);
      childrenByParent.set(row.parent_id, list);
    }

    const roots = scoped.filter(
      (row) => !row.parent_id || !byId.has(row.parent_id),
    );

    return roots.map((row) => {
      const item = toNavItem(row);
      if (row.id) {
        const children = childrenByParent.get(row.id)?.map(toNavItem);
        if (children?.length) item.children = children;
      }
      return item;
    });
  }

  const primary = buildTree("header");
  const footer = buildTree("footer");

  return {
    primary: primary.length ? primary : defaultPlatformConfig.navigation.primary,
    footer: footer.length ? footer : defaultPlatformConfig.navigation.footer,
  };
}

function coerceLogoSize(value: string | null | undefined): LogoSize {
  if (value === "small" || value === "medium" || value === "large") return value;
  return "medium";
}

export function mapSettingsRowToContact(
  row: SettingsRow | null | undefined,
): ContactConfig {
  if (!row) return defaultPlatformConfig.contact;
  return {
    email: row.contact_email?.trim() || undefined,
    phone: row.contact_phone?.trim() || undefined,
    phoneSecondary: row.contact_phone_secondary?.trim() || undefined,
    addressLine1: row.address_line_1?.trim() || undefined,
    addressLine2: row.address_line_2?.trim() || undefined,
    city: row.city?.trim() || undefined,
    state: row.state?.trim() || undefined,
    postalCode: row.postal_code?.trim() || undefined,
    country: row.country?.trim() || undefined,
  };
}

export function mapSettingsRowToSocial(
  row: SettingsRow | null | undefined,
): SocialLinksConfig {
  if (!row) return defaultPlatformConfig.social;
  return {
    instagram: row.social_instagram?.trim() || undefined,
    facebook: row.social_facebook?.trim() || undefined,
    youtube: row.social_youtube?.trim() || undefined,
    linkedin: row.social_linkedin?.trim() || undefined,
    x: row.social_x?.trim() || undefined,
    whatsapp: row.social_whatsapp?.trim() || undefined,
  };
}

export function mapSettingsRowToHeader(
  row: SettingsRow | null | undefined,
): HeaderChromeConfig {
  const fallback = defaultPlatformConfig.header;
  if (!row) return fallback;
  return {
    sticky: row.header_sticky ?? fallback.sticky,
    searchEnabled: row.header_search_enabled ?? fallback.searchEnabled,
    cartEnabled: row.header_cart_enabled ?? fallback.cartEnabled,
    accountEnabled: row.header_account_enabled ?? fallback.accountEnabled,
    mobileMenuEnabled:
      row.header_mobile_menu_enabled ?? fallback.mobileMenuEnabled,
    navVisible: row.header_nav_visible ?? fallback.navVisible,
    logoSize: coerceLogoSize(row.header_logo_size),
    announcement: {
      enabled: row.announcement_enabled ?? false,
      text: row.announcement_text?.trim() || undefined,
      url: row.announcement_url?.trim() || undefined,
      openInNewTab: row.announcement_open_in_new_tab ?? false,
    },
  };
}

export function mapSettingsRowToFooter(
  row: SettingsRow | null | undefined,
): FooterChromeConfig {
  const fallback = defaultPlatformConfig.footer;
  if (!row) return fallback;
  return {
    enabled: row.footer_enabled ?? fallback.enabled,
    description: row.footer_description?.trim() || undefined,
    showContact: row.footer_show_contact ?? fallback.showContact,
    showSocial: row.footer_show_social ?? fallback.showSocial,
    showNewsletter: row.footer_show_newsletter ?? fallback.showNewsletter,
    navVisible: row.footer_nav_visible ?? fallback.navVisible,
    copyrightText: row.copyright_text?.trim() || undefined,
  };
}

export function mapSettingsRowToStore(
  row: SettingsRow | null | undefined,
  storeName?: string | null,
  legalName?: string | null,
): StoreConfig {
  const fallback = defaultPlatformConfig.store;
  return {
    currency: row?.currency || fallback.currency,
    locale: row?.default_locale?.trim() || fallback.locale,
    timezone: row?.timezone || fallback.timezone,
    supportEmail: row?.contact_email || undefined,
    supportPhone: row?.contact_phone || undefined,
    displayName: storeName?.trim() || fallback.displayName,
    legalName: legalName?.trim() || undefined,
    registrationEnabled: row?.registration_enabled ?? fallback.registrationEnabled,
    checkoutGuestAllowed:
      row?.checkout_guest_allowed ?? fallback.checkoutGuestAllowed,
  };
}

export function getThemeModeFlags(theme: ThemeConfig) {
  return {
    light_enabled: theme.enabledModes.includes("light"),
    dark_enabled: theme.enabledModes.includes("dark"),
    system_enabled: theme.enabledModes.includes("system"),
  };
}
