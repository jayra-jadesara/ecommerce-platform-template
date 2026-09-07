/**
 * Data-access layer stubs.
 * Keep network / Supabase clients here — not inside UI components.
 */

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/** Lightweight context for future service modules. */
export function createServiceContext() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export { STORAGE_BUCKETS } from "@/lib/supabase/storage";
