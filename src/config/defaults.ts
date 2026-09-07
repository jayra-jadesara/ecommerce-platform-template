import type { PlatformConfig } from "@/types";

/**
 * Generic white-label defaults.
 * Replace via CMS / Supabase / env-backed loaders per client deployment.
 * Intentionally client-agnostic — no brand-specific product copy.
 */
export const defaultPlatformConfig: PlatformConfig = {
  brand: {
    name: "Brand Name",
    tagline: "Your store, your brand.",
    logoAlt: "Brand logo",
  },
  theme: {
    defaultMode: "light",
    allowUserToggle: true,
    light: {
      primary: "#1a5f4a",
      secondary: "#2c3e50",
      accent: "#c4783a",
      background: "#f7f5f2",
      foreground: "#1a1a1a",
      surface: "#ffffff",
      card: "#ffffff",
      border: "#e2ddd6",
      muted: "#6b6560",
      success: "#2e7d4f",
      warning: "#b7791f",
      error: "#b42318",
    },
    dark: {
      primary: "#4fd1a5",
      secondary: "#94a3b8",
      accent: "#e8a05c",
      background: "#0f1412",
      foreground: "#f2f0eb",
      surface: "#1a211e",
      card: "#222a26",
      border: "#2f3a35",
      muted: "#9ca89f",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
    },
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
    maxWidth: "72rem",
    headerHeight: "4rem",
    footerVariant: "simple",
    containerPadding: "1.25rem",
    stickyHeader: true,
  },
  animation: {
    enabled: true,
    intensity: "medium",
    defaultPreset: "fade-up",
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
  },
  store: {
    currency: "INR",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },
};
