import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabasePublicEnvOptional } from "@/lib/supabase/env";

/**
 * Cookie-less anon client for public storefront reads (theme, branding, CMS).
 * Never use the service role here.
 */
export function createSupabasePublicClient() {
  const env = getSupabasePublicEnvOptional();
  if (!env) return null;

  try {
    return createClient<Database>(env.url, env.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch {
    return null;
  }
}
