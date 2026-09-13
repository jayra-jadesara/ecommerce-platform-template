"use client";

import { setHeaderAuthSnapshot } from "@/components/common/header-auth-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabasePublicEnvOptional } from "@/lib/supabase/env";

function displayNameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const first = String(meta.first_name ?? meta.firstName ?? "").trim();
  const last = String(meta.last_name ?? meta.lastName ?? "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const email = user.email?.trim();
  if (!email) return null;
  return email.split("@")[0] ?? email;
}

/** Re-read session cookies into the header store (call after login / navigation). */
export async function refreshHeaderAuthFromBrowser() {
  if (typeof window === "undefined") return;
  if (!getSupabasePublicEnvOptional()) {
    setHeaderAuthSnapshot({ ready: true, email: null, displayName: null });
    return;
  }
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  setHeaderAuthSnapshot({
    ready: true,
    email: data.user?.email ?? null,
    displayName: displayNameFromUser(data.user),
  });
}

export { displayNameFromUser };
