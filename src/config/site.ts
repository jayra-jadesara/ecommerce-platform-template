import { defaultPlatformConfig } from "./defaults";
import type { PlatformConfig } from "@/types";

/**
 * Resolves platform config for the current deployment.
 * Phase 1: static defaults. Later: merge Supabase tenant settings.
 */
export function getPlatformConfig(): PlatformConfig {
  return defaultPlatformConfig;
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}
