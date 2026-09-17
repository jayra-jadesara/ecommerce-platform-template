import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { getPlatformConfigAsync } from "@/config/site.server";
import { buildPageMetadata } from "@/lib/metadata";
import { colorTokensToCssVars, normalizeColorTokensForMode } from "@/features/theme/css-vars";
import { typographyCssVars } from "@/features/theme/typography-css";
import {
  FONT_FACE_CSS,
  GOOGLE_FONTS_STYLESHEET_HREF,
} from "@/features/theme/optional-google-fonts";
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
    ...FONT_FACE_CSS,
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
      className={`h-full antialiased${defaultIsDark ? " dark" : ""}`}
      suppressHydrationWarning
      style={layoutVars}
      data-theme-default={config.theme.defaultMode}
      {...motionAttrs}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href={GOOGLE_FONTS_STYLESHEET_HREF} />
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
