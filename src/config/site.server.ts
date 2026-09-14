import "server-only";

import { cache } from "react";
import { defaultPlatformConfig } from "./defaults";
import type { PlatformConfig } from "@/types";

/**
 * Async platform config for Server Components / Route Handlers.
 * Never import this module from Client Components.
 * Request-memoized so root + storefront layout + page share one await.
 */
export const getPlatformConfigAsync = cache(
  async (): Promise<PlatformConfig> => {
    const { measureServerOperation } = await import("@/lib/perf/measure-server");
    return measureServerOperation("storefront.config", async () => {
      try {
        const { getStorefrontPlatformConfig } = await import(
          "@/features/theme/service"
        );
        return await getStorefrontPlatformConfig();
      } catch {
        return defaultPlatformConfig;
      }
    });
  },
);
