import "server-only";

import { defaultPlatformConfig } from "./defaults";
import type { PlatformConfig } from "@/types";

/**
 * Async platform config for Server Components / Route Handlers.
 * Never import this module from Client Components.
 */
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
