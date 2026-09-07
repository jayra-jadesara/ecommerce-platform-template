export { createSupabaseBrowserClient } from "./client";
export { createSupabaseServerClient } from "./server";
export {
  getSupabasePublicEnv,
  getSupabasePublicEnvOptional,
  normalizeSupabaseUrl,
} from "./env";
/** Do not re-export admin client from the barrel — import `@/lib/supabase/admin` explicitly. */
