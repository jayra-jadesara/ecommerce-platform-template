import type { HeadingHighlightStyle } from "@/features/theme/heading-highlight";
import type { StorefrontLoaderStyle } from "@/components/ui/storefront-loader";

export interface BrandConfig {
  name: string;
  tagline?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  logoAlt?: string;
  faviconUrl?: string;
  socialImageUrl?: string;
}

export interface ColorTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  surface: string;
  card: string;
  border: string;
  muted: string;
  success: string;
  warning: string;
  error: string;
  headerBackground: string;
  headerForeground: string;
  footerBackground: string;
  footerForeground: string;
  buttonBackground: string;
  buttonForeground: string;
}

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedThemeMode = "light" | "dark";

export interface ThemeConfig {
  /** Default mode when no user preference is stored. */
  defaultMode: ThemeMode;
  /** Whether end users may switch themes (Admin-controlled). */
  allowUserToggle: boolean;
  /** Admin-enabled modes (light / dark / system). */
  enabledModes: ThemeMode[];
  light: ColorTokens;
  dark: ColorTokens;
  borderRadius?: string;
}

export interface TypographyConfig {
  fontSans: string;
  fontMono: string;
  fontDisplay?: string;
  baseSizePx: number;
  headingWeight: number;
  bodyWeight: number;
  /** Store-wide page/section heading accent decoration. */
  headingHighlightStyle?: HeadingHighlightStyle;
}

export interface LayoutConfig {
  maxWidth: string;
  headerHeight: string;
  footerVariant: "simple" | "detailed";
  containerPadding: string;
  stickyHeader: boolean;
}

export type AnimationPreset =
  | "fade"
  | "fade-up"
  | "fade-down"
  | "slide-up"
  | "slide-down"
  | "scale"
  | "none";

export type AnimationIntensity = "subtle" | "medium" | "strong";

export interface AnimationConfig {
  enabled: boolean;
  intensity: AnimationIntensity;
  defaultPreset: AnimationPreset;
}

export type Visual3dPresetId =
  | "NONE"
  | "FLOATING_SHAPES"
  | "PRODUCT_ORBIT"
  | "ABSTRACT_PARTICLES"
  | "SOFT_GEOMETRY";

export type Visual3dQualityId = "LOW" | "MEDIUM" | "HIGH";

export interface VisualEffectsConfig {
  enabled: boolean;
  heroEnabled: boolean;
  productEnabled: boolean;
  quality: Visual3dQualityId;
  heroPreset: Visual3dPresetId;
  mobileEnabled: boolean;
  respectReducedMotion: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
  external?: boolean;
}

export interface NavigationConfig {
  primary: NavItem[];
  footer: NavItem[];
}

export interface SeoPageCopy {
  title?: string;
  description?: string;
}

/** Keys for storefront pages with SEO managed from Google & SEO admin. */
export type SeoManagedPageKey =
  | "about"
  | "contact"
  | "career"
  | "products"
  | "blog"
  | "brochure"
  | "privacy"
  | "terms"
  | "disclaimer";

/** Structured data + sitemap controls from Google & SEO admin. */
export interface SeoSitemapPathConfig {
  id: string;
  path: string;
  label: string;
  priority: number;
  enabled: boolean;
  cmsSlug: string;
}

/** Master storefront URL catalog — single source for path dropdowns. */
export interface SeoStorefrontPathConfig {
  id: string;
  path: string;
  label: string;
  cmsSlug: string;
}

export interface SeoSchemaSettings {
  localBusiness: boolean;
  organization: boolean;
  websiteSearch: boolean;
  /** schema.org subtype, e.g. Store, ClothingStore. Empty = LocalBusiness. */
  businessType?: string;
  priceRange?: string;
  geoLat?: string;
  geoLng?: string;
  /** Include /products/{slug} URLs. */
  sitemapProducts: boolean;
  /** Include /categories/{slug} URLs. */
  sitemapCategories: boolean;
  /** Include /blog/{slug} post URLs. */
  sitemapBlog: boolean;
  /** Canonical storefront paths managed in Google & SEO. */
  storefrontPaths: SeoStorefrontPathConfig[];
  /** Sitemap enable/priority for paths from storefrontPaths. */
  sitemapPaths: SeoSitemapPathConfig[];
}

export interface SeoConfig {
  title: string;
  titleTemplate?: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  /** Live store origin from admin (preferred over NEXT_PUBLIC_SITE_URL). */
  canonicalUrl?: string;
  siteName?: string;
  twitterHandle?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  /** Google Search Console meta verification token. */
  googleSiteVerification?: string;
  /** Per-page title/description from DB. */
  pages?: Partial<Record<SeoManagedPageKey, SeoPageCopy>>;
  /** JSON-LD + sitemap controls from schema_settings. */
  schema?: SeoSchemaSettings;
}

export interface StoreConfig {
  currency: string;
  locale: string;
  supportEmail?: string;
  supportPhone?: string;
  timezone?: string;
  displayName?: string;
  legalName?: string;
  registrationEnabled?: boolean;
  checkoutGuestAllowed?: boolean;
  /** Dial code for store phones (e.g. +91). */
  phoneCountryCode?: string;
}

/** Active store identity for Realtime sync isolation (not display settings). */
export type StoreIdentity = {
  id: string | null;
  slug: string | null;
};

export interface ContactConfig {
  email?: string;
  phone?: string;
  phoneSecondary?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  /** Contact page hero banner — off until enabled + path. */
  bannerEnabled?: boolean;
  bannerImagePath?: string;
  /** Visit & reach us side image — off by default. */
  spotlightEnabled?: boolean;
  spotlightImagePath?: string;
  /** Storefront /contact H1 (falls back to “Let’s connect”). */
  pageHeading?: string;
  /** Line under the heading. */
  pageSupport?: string;
  /** Show map block on /contact. Default true when unset. */
  mapEnabled?: boolean;
  /** Optional Google Maps embed `src` URL (preferred pin). */
  mapEmbedUrl?: string;
  /** Dial code mirrored from store settings for display helpers. */
  phoneCountryCode?: string;
}

export interface SocialLinksConfig {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  linkedin?: string;
  x?: string;
  whatsapp?: string;
}

export type LogoSize = "small" | "medium" | "large" | "xlarge";

/** How far the logo hangs over the hero. Independent of size. */
export type LogoHang = "none" | "soft" | "medium" | "bold";

export interface AnnouncementConfig {
  enabled: boolean;
  text?: string;
  url?: string;
  openInNewTab: boolean;
}

export interface HeaderChromeConfig {
  sticky: boolean;
  searchEnabled: boolean;
  cartEnabled: boolean;
  accountEnabled: boolean;
  mobileMenuEnabled: boolean;
  navVisible: boolean;
  /** When true, Products nav item shows an active-categories dropdown. Default false. */
  productsCategoryMenu: boolean;
  logoSize: LogoSize;
  logoHang: LogoHang;
  announcement: AnnouncementConfig;
}

export interface FooterChromeConfig {
  enabled: boolean;
  description?: string;
  showContact: boolean;
  showSocial: boolean;
  showNewsletter: boolean;
  showLogo: boolean;
  navVisible: boolean;
  copyrightText?: string;
  showFeaturedProduct: boolean;
  featuredProductId?: string | null;
}

export type FooterFeaturedProduct = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

export type StorefrontUiConfig = {
  loaderStyle: StorefrontLoaderStyle;
  loaderLabel: string;
};

/** Aggregate config — populated from Supabase when available. */
export interface PlatformConfig {
  /** Store-scoped id/slug for Admin→Storefront live sync. */
  identity: StoreIdentity;
  brand: BrandConfig;
  theme: ThemeConfig;
  typography: TypographyConfig;
  layout: LayoutConfig;
  animation: AnimationConfig;
  visualEffects: VisualEffectsConfig;
  navigation: NavigationConfig;
  seo: SeoConfig;
  store: StoreConfig;
  contact: ContactConfig;
  social: SocialLinksConfig;
  header: HeaderChromeConfig;
  footer: FooterChromeConfig;
  ui: StorefrontUiConfig;
}
