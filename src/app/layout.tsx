import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  JetBrains_Mono,
  Libre_Baskerville,
  Lora,
  Manrope,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Space_Grotesk,
  Syne,
} from "next/font/google";
import { getPlatformConfigAsync } from "@/config/site.server";
import { buildPageMetadata } from "@/lib/metadata";
import { colorTokensToCssVars, normalizeColorTokensForMode } from "@/features/theme/css-vars";
import { typographyCssVars } from "@/features/theme/typography-css";
import {
  motionDesignTokens,
  motionHtmlDataAttributes,
  resolveMotionConfig,
} from "@/features/motion-3d";
import { AppProviders } from "@/providers";
import { ServiceWorkerRegister } from "@/features/pwa/ServiceWorkerRegister";
import { OfflineBanner } from "@/features/pwa/OfflineBanner";
import { getAdminRouteSegment } from "@/config/admin-route";
import "./globals.css";

const fontDmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  adjustFontFallback: true,
});

const fontFraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  adjustFontFallback: true,
});

const fontJetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

const fontPlayfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

const fontCormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

const fontLibreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre-baskerville",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

const fontOutfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

const fontPlusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

const fontManrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

const fontLora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

const fontSpaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

const fontSyne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

const storefrontFontVariables = [
  fontDmSans.variable,
  fontFraunces.variable,
  fontJetbrainsMono.variable,
  fontPlayfair.variable,
  fontCormorant.variable,
  fontLibreBaskerville.variable,
  fontOutfit.variable,
  fontPlusJakarta.variable,
  fontManrope.variable,
  fontLora.variable,
  fontSpaceGrotesk.variable,
  fontSyne.variable,
].join(" ");

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPlatformConfigAsync();
  const metadata = buildPageMetadata({
    seo: config.seo,
    ogImage: config.seo.ogImage ?? config.brand.socialImageUrl,
  });

  const themeColor =
    config.theme.light.primary || config.theme.light.background;

  return {
    ...metadata,
    icons: config.brand.faviconUrl
      ? { icon: [{ url: config.brand.faviconUrl }] }
      : { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
    appleWebApp: {
      capable: true,
      title: config.brand.name,
      statusBarStyle: "default",
    },
    other: {
      "theme-color": themeColor,
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await getPlatformConfigAsync();
  let adminSegment = "manage-store";
  try {
    adminSegment = getAdminRouteSegment();
  } catch {
    // keep default
  }

  const initialTokens = normalizeColorTokensForMode(
    config.theme.defaultMode === "dark" ? config.theme.dark : config.theme.light,
    config.theme.defaultMode === "dark" ? "dark" : "light",
  );

  const motionEffective = resolveMotionConfig({
    global: config.animation,
    reducedMotion: false,
  });
  const motionVars = motionDesignTokens(motionEffective);
  const motionAttrs = motionHtmlDataAttributes(motionEffective);

  const layoutVars = {
    ...colorTokensToCssVars(initialTokens),
    ...typographyCssVars(config.typography),
    ...motionVars,
    "--layout-max-width": config.layout.maxWidth,
    "--layout-header-height": config.layout.headerHeight,
    "--layout-container-padding": config.layout.containerPadding,
    ...(config.theme.borderRadius
      ? { "--radius-default": config.theme.borderRadius }
      : {}),
  } as CSSProperties;

  const defaultIsDark = config.theme.defaultMode === "dark";

  return (
    <html
      lang={config.store.locale.split("-")[0] ?? "en"}
      className={`${storefrontFontVariables} h-full antialiased${defaultIsDark ? " dark" : ""}`}
      suppressHydrationWarning
      style={layoutVars}
      data-theme-default={config.theme.defaultMode}
      {...motionAttrs}
    >
      <head>
        {/*
          Theme FOUC boot is injected via ThemeBootScript + useServerInsertedHTML
          (not a <script> in the React tree — avoids React 19 client warning).
        */}
        {config.brand.faviconUrl ? (
          <link rel="icon" href={config.brand.faviconUrl} />
        ) : (
          <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        )}
        <meta name="theme-color" content={initialTokens.primary} />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className="flex min-h-full min-h-dvh flex-col bg-[var(--color-background)] text-[var(--color-foreground)] pb-[env(safe-area-inset-bottom)]"
        suppressHydrationWarning
      >
        <OfflineBanner />
        <AppProviders config={config}>{children}</AppProviders>
        <ServiceWorkerRegister adminSegment={adminSegment} />
      </body>
    </html>
  );
}
