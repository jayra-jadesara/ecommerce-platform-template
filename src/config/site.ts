import { defaultPlatformConfig } from "./defaults";
import type { PlatformConfig } from "@/types";
import { resolveTrustedSiteUrl } from "@/lib/site-url";

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

/** Validated white-label site origin — never from request Host. */
export function getSiteUrl(): string {
  return resolveTrustedSiteUrl();
}
