/**
 * Env helpers for Supabase.
 * Never import service-role keys into client bundles.
 */

function readPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  return { url, anonKey };
}

export function getSupabasePublicEnv() {
  const { url, anonKey } = readPublicEnv();

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.",
    );
  }

  return { url, anonKey };
}

/** Returns null when public env is not configured yet (Phase 1 local UI still works). */
export function getSupabasePublicEnvOptional() {
  const { url, anonKey } = readPublicEnv();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
