"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { ReactNode } from "react";
import { PlatformThemeProvider } from "@/features/theme";
import { QueryProvider } from "@/providers/QueryProvider";
import type { PlatformConfig } from "@/types";

interface AppProvidersProps {
  config: PlatformConfig;
  children: ReactNode;
}

/**
 * Client-side provider tree: React Query, MUI cache, theme.
 * Keep server components outside this boundary where possible.
 */
export function AppProviders({ config, children }: AppProvidersProps) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <QueryProvider>
        <PlatformThemeProvider config={config}>{children}</PlatformThemeProvider>
      </QueryProvider>
    </AppRouterCacheProvider>
  );
}
