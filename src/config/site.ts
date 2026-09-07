import { defaultPlatformConfig } from "./defaults";
import type { PlatformConfig } from "@/types";

/**
 * Sync fallback for non-async contexts.
 * Prefer `getPlatformConfigAsync()` / `getStorefrontPlatformConfig()` in App Router.
 */
export function getPlatformConfig(): PlatformConfig {
  return defaultPlatformConfig;
}

export async function getPlatformConfigAsync(): Promise<PlatformConfig> {
  try {
    const { getStorefrontPlatformConfig } = await import(
      "@/features/theme/service"
    );
    return await getStorefrontPlatformConfig();
  } catch {
    return defaultPlatformConfig;
  }
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}
