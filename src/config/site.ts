import { defaultPlatformConfig } from "./defaults";
import type { PlatformConfig } from "@/types";
import { resolveTrustedSiteUrl } from "@/lib/site-url";

/**
 * Sync fallback for non-async / Client-safe contexts.
 * Prefer `getPlatformConfigAsync()` from `@/config/site.server` in Server Components.
 *
 * This module must stay free of restricted server packages so Client Components
 * can safely call `getSiteUrl()`.
 */
export function getPlatformConfig(): PlatformConfig {
  return defaultPlatformConfig;
}

/** Validated white-label site origin — never from request Host. */
export function getSiteUrl(): string {
  return resolveTrustedSiteUrl();
}

/**
 * @deprecated Import from `@/config/site.server` instead.
 * Kept as a typed re-export path for documentation only — do not use from clients.
 */
export type { PlatformConfig };
