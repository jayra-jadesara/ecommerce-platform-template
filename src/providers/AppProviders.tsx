"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { ReactNode } from "react";
import { PlatformThemeProvider } from "@/features/theme";
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
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
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
