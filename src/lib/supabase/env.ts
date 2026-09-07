/**
 * Env helpers for Supabase.
 * Never import service-role keys into client bundles.
 */

/**
 * Accepts either a full Project URL or a bare project ref and returns a valid
 * https://…supabase.co URL, or "" when unusable.
 */
export function normalizeSupabaseUrl(raw: string | undefined | null): string {
  let value = (raw ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (!value) return "";

  // Bare project ref pasted by mistake
  if (/^[a-z0-9-]+$/i.test(value)) {
    value = `https://${value}.supabase.co`;
  } else if (/^[a-z0-9-]+\.supabase\.co$/i.test(value)) {
    value = `https://${value}`;
  }

  value = value.replace(/\/+$/, "");

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.origin;
  } catch {
    return "";
  }
}

function readPublicEnv() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  return { url, anonKey };
}

export function getSupabasePublicEnv() {
  const { url, anonKey } = readPublicEnv();

  if (!url || !anonKey) {
    throw new Error(
      "Missing or invalid NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Use the full Project URL (https://YOUR_REF.supabase.co) and the Publishable/anon key in .env.local.",
    );
  }

  return { url, anonKey };
}

/** Returns null when public env is missing or the URL is not a valid http(s) URL. */
export function getSupabasePublicEnvOptional() {
  const { url, anonKey } = readPublicEnv();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
