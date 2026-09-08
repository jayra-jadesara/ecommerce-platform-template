/**
 * Initialize / ensure a generic active store + settings stubs.
 * Does NOT create demo products or customers.
 *
 * Usage:
 *   node scripts/init-store.mjs
 *   STORE_NAME="Acme Shop" STORE_SLUG=acme node scripts/init-store.mjs
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles, normalizeSupabaseUrl } from "./lib/env.mjs";

const DEFAULT_NAME = "My Store";
const DEFAULT_TAGLINE = "Your store, your brand.";

const LIGHT = {
  primary: "#1a5f4a",
  secondary: "#2c3e50",
  accent: "#c4783a",
  background: "#f7f5f2",
  foreground: "#1a1a1a",
  surface: "#ffffff",
  card: "#ffffff",
  border: "#e2ddd6",
  muted: "#6b6560",
  success: "#2e7d4f",
  warning: "#b7791f",
  error: "#b42318",
};

const DARK = {
  primary: "#4fd1a5",
  secondary: "#94a3b8",
  accent: "#e8a05c",
  background: "#0f1412",
  foreground: "#f2f0eb",
  surface: "#1a211e",
  card: "#222a26",
  border: "#2f3a35",
  muted: "#9ca89f",
  success: "#4ade80",
  warning: "#fbbf24",
  error: "#f87171",
};

function colorFields(prefix, tokens) {
  const out = {};
  for (const [k, v] of Object.entries(tokens)) {
    out[`${prefix}_${k}`] = v;
  }
  return out;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function upsertByStoreId(admin, table, storeId, row) {
  const { data } = await admin
    .from(table)
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();
  if (data) return;
  const { error } = await admin.from(table).insert(row);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function main() {
  const env = loadEnvFiles();
  const url = normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !serviceKey) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  const name = (env.STORE_NAME || DEFAULT_NAME).trim() || DEFAULT_NAME;
  const slug =
    (env.STORE_SLUG || env.NEXT_PUBLIC_STORE_SLUG || slugify(name) || "my-store")
      .trim()
      .toLowerCase();

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ensure system roles exist
  const { error: rolesError } = await admin.from("roles").upsert(
    [
      {
        code: "SUPER_ADMIN",
        name: "Super Admin",
        description: "Full platform access including role assignment",
      },
      {
        code: "ADMIN",
        name: "Admin",
        description: "Store administration and catalog management",
      },
      {
        code: "EDITOR",
        name: "Editor",
        description: "Content, catalog, and media editing",
      },
      {
        code: "ORDER_MANAGER",
        name: "Order Manager",
        description: "Orders, payments, and fulfillment",
      },
    ],
    { onConflict: "code" },
  );
  if (rolesError) {
    console.error("Apply migrations first. Roles upsert failed:", rolesError.message);
    process.exit(1);
  }

  let storeId;
  const { data: existing } = await admin
    .from("stores")
    .select("id, name, slug, status")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    storeId = existing.id;
    if (existing.status !== "active") {
      await admin
        .from("stores")
        .update({ status: "active", name })
        .eq("id", storeId);
    }
    console.log(`Using existing store ${slug} (${storeId})`);
  } else {
    const { data: created, error } = await admin
      .from("stores")
      .insert({ name, slug, status: "active" })
      .select("id")
      .maybeSingle();
    if (error || !created) {
      console.error("Store create failed:", error?.message);
      process.exit(1);
    }
    storeId = created.id;
    console.log(`Created store ${slug} (${storeId})`);
  }

  await upsertByStoreId(admin, "store_settings", storeId, {
    store_id: storeId,
  });
  await upsertByStoreId(admin, "store_branding", storeId, {
    store_id: storeId,
    brand_name: name,
    tagline: DEFAULT_TAGLINE,
  });
  await upsertByStoreId(admin, "store_theme_settings", storeId, {
    store_id: storeId,
    default_mode: "light",
    enabled_modes: ["light", "dark", "system"],
    allow_user_toggle: true,
    ...colorFields("light", LIGHT),
    ...colorFields("dark", DARK),
    border_radius: "8px",
  });
  await upsertByStoreId(admin, "store_animation_settings", storeId, {
    store_id: storeId,
  });
  await upsertByStoreId(admin, "store_visual_effects_settings", storeId, {
    store_id: storeId,
    enabled: false,
  });
  await upsertByStoreId(admin, "store_seo_settings", storeId, {
    store_id: storeId,
    site_title: name,
    meta_description: "Shop online at your store.",
  });
  await upsertByStoreId(admin, "shipping_settings", storeId, {
    store_id: storeId,
  });
  await upsertByStoreId(admin, "payment_settings", storeId, {
    store_id: storeId,
    provider: "none",
  });

  console.log("");
  console.log("Store initialization complete (no demo catalog).");
  console.log(`Name: ${name}`);
  console.log(`Slug: ${slug}`);
  console.log("Next: create first admin → configure branding in Admin.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
