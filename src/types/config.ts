import type { HeadingHighlightStyle } from "@/features/theme/heading-highlight";

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

export interface SeoConfig {
  title: string;
  titleTemplate?: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
  siteName?: string;
  twitterHandle?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
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
}

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
}

export interface SocialLinksConfig {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  linkedin?: string;
  x?: string;
  whatsapp?: string;
}

export type LogoSize = "small" | "medium" | "large";

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
  logoSize: LogoSize;
  announcement: AnnouncementConfig;
}

export interface FooterChromeConfig {
  enabled: boolean;
  description?: string;
  showContact: boolean;
  showSocial: boolean;
  showNewsletter: boolean;
  navVisible: boolean;
  copyrightText?: string;
}

/** Aggregate config — populated from Supabase when available. */
export interface PlatformConfig {
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
}
