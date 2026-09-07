/**
 * Central platform configuration contracts.
 * Designed to be populated from Supabase (or other backends) in later phases.
 * Do not hardcode client-specific brand content into reusable components.
 */

export interface BrandConfig {
  name: string;
  tagline?: string;
  logoUrl?: string;
  logoAlt?: string;
  faviconUrl?: string;
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
}

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedThemeMode = "light" | "dark";

export interface ThemeConfig {
  /** Default mode when no user preference is stored. */
  defaultMode: ThemeMode;
  /** Whether end users may switch themes (admin-controlled later). */
  allowUserToggle: boolean;
  light: ColorTokens;
  dark: ColorTokens;
}

export interface TypographyConfig {
  fontSans: string;
  fontMono: string;
  fontDisplay?: string;
  baseSizePx: number;
  headingWeight: number;
  bodyWeight: number;
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
  ogImage?: string;
  canonicalUrl?: string;
  siteName?: string;
  twitterHandle?: string;
}

export interface StoreConfig {
  currency: string;
  locale: string;
  supportEmail?: string;
  supportPhone?: string;
  timezone?: string;
}

/** Aggregate config — future multi-tenant / Supabase source of truth. */
export interface PlatformConfig {
  brand: BrandConfig;
  theme: ThemeConfig;
  typography: TypographyConfig;
  layout: LayoutConfig;
  animation: AnimationConfig;
  navigation: NavigationConfig;
  seo: SeoConfig;
  store: StoreConfig;
}
