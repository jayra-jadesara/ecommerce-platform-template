"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { ReactNode } from "react";
import { PlatformThemeProvider } from "@/features/theme";
import { ThemeBootScript } from "@/features/theme/ThemeBootScript";
import { buildThemeBootScript } from "@/features/theme/theme-boot-script";
import { PlatformConfigProvider } from "@/providers/PlatformConfigProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import type { PlatformConfig } from "@/types";

interface AppProvidersProps {
  config: PlatformConfig;
  children: ReactNode;
}

/**
 * Client-side provider tree: config, React Query, MUI cache, theme.
 */
export function AppProviders({ config, children }: AppProvidersProps) {
  const themeBoot = buildThemeBootScript(config);

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeBootScript script={themeBoot} />
      <PlatformConfigProvider config={config}>
        <QueryProvider>
          <PlatformThemeProvider config={config}>
            {children}
          </PlatformThemeProvider>
        </QueryProvider>
      </PlatformConfigProvider>
    </AppRouterCacheProvider>
  );
}
