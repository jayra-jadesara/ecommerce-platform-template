import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { getPlatformConfigAsync } from "@/config/site";
import { buildPageMetadata } from "@/lib/metadata";
import { colorTokensToCssVars } from "@/features/theme/css-vars";
import { buildThemeBootScript } from "@/features/theme/theme-boot-script";
import { AppProviders } from "@/providers";
import { ServiceWorkerRegister } from "@/features/pwa/ServiceWorkerRegister";
import { OfflineBanner } from "@/features/pwa/OfflineBanner";
import { getAdminRouteSegment } from "@/config/admin-route";
import "./globals.css";

const fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: true,
});

const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: true,
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

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

  const initialTokens =
    config.theme.defaultMode === "dark" ? config.theme.dark : config.theme.light;

  const layoutVars = {
    ...colorTokensToCssVars(initialTokens),
    "--layout-max-width": config.layout.maxWidth,
    "--layout-header-height": config.layout.headerHeight,
    "--layout-container-padding": config.layout.containerPadding,
    ...(config.theme.borderRadius
      ? { "--radius-default": config.theme.borderRadius }
      : {}),
  } as CSSProperties;

  const themeBoot = buildThemeBootScript(config);
  const defaultIsDark = config.theme.defaultMode === "dark";

  return (
    <html
      lang={config.store.locale.split("-")[0] ?? "en"}
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} h-full antialiased${defaultIsDark ? " dark" : ""}`}
      suppressHydrationWarning
      style={layoutVars}
      data-theme-default={config.theme.defaultMode}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
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
