import type { CSSProperties, ReactNode } from "react";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { AppLayout } from "@/components/layout";
import { getPlatformConfig } from "@/config/site";
import { buildPageMetadata } from "@/lib/metadata";
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

export const metadata = buildPageMetadata();

export default function RootLayout({ children }: { children: ReactNode }) {
  const config = getPlatformConfig();

  const layoutVars = {
    "--layout-max-width": config.layout.maxWidth,
    "--layout-header-height": config.layout.headerHeight,
    "--layout-container-padding": config.layout.containerPadding,
  } as CSSProperties;

  return (
    <html
      lang={config.store.locale.split("-")[0] ?? "en"}
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} h-full antialiased`}
      suppressHydrationWarning
      style={layoutVars}
    >
      <body className="flex min-h-full flex-col">
        <AppProviders config={config}>
          <AppLayout config={config}>{children}</AppLayout>
        </AppProviders>
      </body>
    </html>
  );
}
