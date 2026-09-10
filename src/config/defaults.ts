import type { ColorTokens, PlatformConfig } from "@/types";

function withChrome(
  base: Omit<
    ColorTokens,
    | "headerBackground"
    | "headerForeground"
    | "footerBackground"
    | "footerForeground"
    | "buttonBackground"
    | "buttonForeground"
  >,
  buttonForeground: string,
): ColorTokens {
  return {
    ...base,
    headerBackground: base.surface,
    headerForeground: base.foreground,
    footerBackground: base.surface,
    footerForeground: base.muted,
    buttonBackground: base.primary,
    buttonForeground,
  };
}

/**
 * Generic white-label defaults used when Supabase config is missing/invalid.
 * Hex values here are intentional safe fallbacks — not client branding.
 */
export const defaultPlatformConfig: PlatformConfig = {
  brand: {
    name: "Brand Name",
    tagline: "Authentic flavours for every kitchen.",
    logoAlt: "Brand logo",
  },
  theme: {
    defaultMode: "light",
    allowUserToggle: true,
    enabledModes: ["light", "dark", "system"],
    light: {
      ...withChrome(
        {
          primary: "#9f1239",
          secondary: "#44403c",
          accent: "#d97706",
          background: "#fff8f0",
          foreground: "#1c1917",
          surface: "#fffdf9",
          card: "#ffffff",
          border: "#eadfce",
          muted: "#78716c",
          success: "#3f6212",
          warning: "#a16207",
          error: "#b91c1c",
        },
        "#fff8f0",
      ),
      footerBackground: "#1c1917",
      footerForeground: "#f5f0e8",
    },
    dark: withChrome(
      {
        primary: "#fb923c",
        secondary: "#a8a29e",
        accent: "#fbbf24",
        background: "#140f0c",
        foreground: "#faf6f1",
        surface: "#1f1712",
        card: "#2a1f18",
        border: "#3f2e24",
        muted: "#a8a29e",
        success: "#a3e635",
        warning: "#fbbf24",
        error: "#f87171",
      },
      "#140f0c",
    ),
    borderRadius: "14px",
  },
  typography: {
    fontSans: "var(--font-sans)",
    fontMono: "var(--font-mono)",
    fontDisplay: "var(--font-display)",
    baseSizePx: 16,
    headingWeight: 600,
    bodyWeight: 400,
  },
  layout: {
    maxWidth: "100%",
    headerHeight: "4.75rem",
    footerVariant: "simple",
    containerPadding: "1.5rem",
    stickyHeader: true,
  },
  animation: {
    enabled: true,
    intensity: "medium",
    defaultPreset: "fade-up",
  },
  visualEffects: {
    enabled: false,
    heroEnabled: false,
    productEnabled: false,
    quality: "MEDIUM",
    heroPreset: "NONE",
    mobileEnabled: false,
    respectReducedMotion: true,
  },
  navigation: {
    primary: [
      { label: "Home", href: "/" },
      { label: "Products", href: "/products" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    footer: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Contact", href: "/contact" },
    ],
  },
  seo: {
    title: "Brand Name",
    titleTemplate: "%s | Brand Name",
    description:
      "A reusable white-label e-commerce storefront. Configure brand, theme, and catalog per client.",
    siteName: "Brand Name",
    robotsIndex: true,
    robotsFollow: true,
  },
  store: {
    currency: "INR",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    displayName: "Brand Name",
    registrationEnabled: true,
    checkoutGuestAllowed: true,
  },
  contact: {},
  social: {},
  header: {
    sticky: true,
    searchEnabled: true,
    cartEnabled: true,
    accountEnabled: true,
    mobileMenuEnabled: true,
    navVisible: true,
    logoSize: "large",
    announcement: {
      enabled: false,
      openInNewTab: false,
    },
  },
  footer: {
    enabled: true,
    showContact: true,
    showSocial: true,
    showNewsletter: false,
    navVisible: true,
  },
};
