import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getConfiguredStoreSlug(): string | null {
  const slug =
    process.env.STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "";
  return slug || null;
}

export async function resolveActiveStoreId(
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<string | null> {
  const client = supabase ?? (await createSupabaseServerClient());
  const slug = getConfiguredStoreSlug();

  let query = client.from("stores").select("id").eq("status", "active").limit(1);

  if (slug) {
    query = client
      .from("stores")
      .select("id")
      .eq("status", "active")
      .eq("slug", slug)
      .limit(1);
  }

  const { data, error } = await query;
  if (error || !data?.[0]) return null;
  return data[0].id;
}

export async function resolveActiveStore(
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<{ id: string; name: string; legal_name: string | null } | null> {
  const client = supabase ?? (await createSupabaseServerClient());
  const slug = getConfiguredStoreSlug();

  let query = client
    .from("stores")
    .select("id, name, legal_name")
    .eq("status", "active")
    .limit(1);

  if (slug) {
    query = client
      .from("stores")
      .select("id, name, legal_name")
      .eq("status", "active")
      .eq("slug", slug)
      .limit(1);
  }

  const { data, error } = await query;
  if (error || !data?.[0]) return null;
  return data[0];
}

export type SettingsUpdateResult =
  | { ok: true; message: string }
  | { ok: false; error: string };
