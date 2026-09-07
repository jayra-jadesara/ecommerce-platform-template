import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { getPlatformConfigAsync } from "@/config/site";
import { buildPageMetadata } from "@/lib/metadata";
import { colorTokensToCssVars } from "@/features/theme/css-vars";
import { AppProviders } from "@/providers";
import "./globals.css";

const fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPlatformConfigAsync();
  const metadata = buildPageMetadata({
    seo: config.seo,
    ogImage: config.seo.ogImage ?? config.brand.socialImageUrl,
  });

  return {
    ...metadata,
    icons: config.brand.faviconUrl
      ? { icon: [{ url: config.brand.faviconUrl }] }
      : undefined,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = await getPlatformConfigAsync();

  // SSR initial tokens from store default (light unless default is dark).
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

  return (
    <html
      lang={config.store.locale.split("-")[0] ?? "en"}
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} h-full antialiased`}
      suppressHydrationWarning
      style={layoutVars}
      data-theme-default={config.theme.defaultMode}
    >
      <head>
        {config.brand.faviconUrl ? (
          <link rel="icon" href={config.brand.faviconUrl} />
        ) : null}
      </head>
      <body className="flex min-h-full flex-col">
        <AppProviders config={config}>{children}</AppProviders>
      </body>
    </html>
  );
}
