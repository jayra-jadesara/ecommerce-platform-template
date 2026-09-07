/**
 * Data-access layer stubs.
 * Keep network / Supabase clients here — not inside UI components.
 */

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/** Placeholder — replace with Supabase client factory in a later phase. */
export function createServiceContext() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  };
}
