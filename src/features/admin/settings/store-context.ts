import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicEnvOptional } from "@/lib/supabase/env";
import { slugify } from "@/features/catalog/slug";
import {
  DEFAULT_FRESH_STORE_NAME,
  DEFAULT_FRESH_STORE_TAGLINE,
  buildDefaultSeoInsert,
  buildDefaultThemeInsert,
} from "@/features/admin/settings/store-defaults";
import type { FieldErrors } from "@/lib/validation";

function getConfiguredStoreSlug(): string | null {
  const slug =
    process.env.STORE_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "";
  return slug || null;
}

export type ActiveStore = {
  id: string;
  name: string;
  legal_name: string | null;
};

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function getClient(
  supabase?: SupabaseServer,
): Promise<SupabaseServer | null> {
  if (supabase) return supabase;
  if (!getSupabasePublicEnvOptional()) return null;
  return createSupabaseServerClient();
}

export async function resolveActiveStoreId(
  supabase?: SupabaseServer,
): Promise<string | null> {
  const store = await resolveActiveStore(supabase);
  return store?.id ?? null;
}

export async function resolveActiveStore(
  supabase?: SupabaseServer,
): Promise<ActiveStore | null> {
  const client = await getClient(supabase);
  if (!client) return null;

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

/**
 * Resolves an active store, or creates/activates one for SUPER_ADMIN/ADMIN
 * so first-time setup can save Store Information without a seed script.
 */
export async function ensureActiveStore(
  supabase: SupabaseServer,
  options?: { name?: string; legalName?: string | null },
): Promise<ActiveStore | { error: string }> {
  const existing = await resolveActiveStore(supabase);
  if (existing) return existing;

  const preferredName = options?.name?.trim() || DEFAULT_FRESH_STORE_NAME;
  const preferredLegal = options?.legalName?.trim() || null;
  const configuredSlug = getConfiguredStoreSlug();
  const baseSlug = configuredSlug || slugify(preferredName) || "main-store";

  // Prefer activating an existing non-active store (draft / suspended).
  let inactiveQuery = supabase
    .from("stores")
    .select("id, name, legal_name, slug, status")
    .neq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  if (configuredSlug) {
    inactiveQuery = supabase
      .from("stores")
      .select("id, name, legal_name, slug, status")
      .eq("slug", configuredSlug)
      .limit(1);
  }

  const { data: inactiveRows } = await inactiveQuery;
  const inactive = inactiveRows?.[0];

  if (inactive) {
    const { data: activated, error: activateError } = await supabase
      .from("stores")
      .update({
        status: "active",
        name: preferredName,
        legal_name: preferredLegal,
      })
      .eq("id", inactive.id)
      .select("id, name, legal_name")
      .maybeSingle();

    if (activateError || !activated) {
      return {
        error:
          activateError?.message ||
          "Could not activate your store. Check admin permissions and try again.",
      };
    }

    await ensureStoreSettingsStub(supabase, activated.id, preferredName);
    return activated;
  }

  // Create a new active store.
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = attempt === 0 ? slug : `${baseSlug}-${attempt + 1}`;
    const { data: created, error: createError } = await supabase
      .from("stores")
      .insert({
        name: preferredName,
        slug: candidate,
        legal_name: preferredLegal,
        status: "active",
      })
      .select("id, name, legal_name")
      .maybeSingle();

    if (!createError && created) {
      await ensureStoreSettingsStub(supabase, created.id, preferredName);
      return created;
    }

    // Unique slug conflict — try next candidate
    if (createError && /duplicate|unique/i.test(createError.message)) {
      slug = candidate;
      continue;
    }

    return {
      error:
        createError?.message ||
        "Could not create your store. Make sure migrations are applied and you have admin access.",
    };
  }

  return {
    error: "Could not create a unique store slug. Try a different store name.",
  };
}

async function ensureStoreSettingsStub(
  supabase: SupabaseServer,
  storeId: string,
  brandName: string,
) {
  const { data: settings } = await supabase
    .from("store_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();

  if (!settings) {
    await supabase.from("store_settings").insert({ store_id: storeId });
  }

  const { data: branding } = await supabase
    .from("store_branding")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();

  if (!branding) {
    await supabase.from("store_branding").insert({
      store_id: storeId,
      brand_name: brandName,
      tagline: DEFAULT_FRESH_STORE_TAGLINE,
    });
  }

  const { data: theme } = await supabase
    .from("store_theme_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!theme) {
    await supabase
      .from("store_theme_settings")
      .insert(buildDefaultThemeInsert(storeId));
  }

  const { data: animation } = await supabase
    .from("store_animation_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!animation) {
    await supabase.from("store_animation_settings").insert({ store_id: storeId });
  }

  const { data: visual } = await supabase
    .from("store_visual_effects_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!visual) {
    await supabase.from("store_visual_effects_settings").insert({
      store_id: storeId,
      enabled: false,
      hero_enabled: false,
      product_enabled: false,
    });
  }

  const { data: seo } = await supabase
    .from("store_seo_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!seo) {
    await supabase
      .from("store_seo_settings")
      .insert(buildDefaultSeoInsert(storeId, brandName));
  }

  const { data: shipping } = await supabase
    .from("shipping_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!shipping) {
    await supabase.from("shipping_settings").insert({ store_id: storeId });
  }

  const { data: payment } = await supabase
    .from("payment_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!payment) {
    await supabase.from("payment_settings").insert({
      store_id: storeId,
      provider: "none",
    });
  }
}

export type SettingsUpdateResult =
  | { ok: true; message: string; path?: string }
  | {
      ok: false;
      error: string;
      referenceId?: string;
      fieldErrors?: FieldErrors;
    };
