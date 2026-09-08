/**
 * First-admin bootstrap (deliberate, not public self-service).
 *
 * Usage:
 *   node scripts/create-default-admin.mjs
 *   ADMIN_EMAIL=you@client.com node scripts/create-default-admin.mjs
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Optional: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ROUTE
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { loadEnvFiles, normalizeSupabaseUrl } from "./lib/env.mjs";

async function main() {
  const env = loadEnvFiles();
  const url = normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !url.includes("supabase.co")) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL must be https://YOUR_REF.supabase.co",
    );
    process.exit(1);
  }
  if (!serviceKey) {
    console.error(
      "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Settings → API).",
    );
    process.exit(1);
  }

  const email = (env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const password =
    (env.ADMIN_PASSWORD || "").trim() ||
    `Admin-${randomBytes(6).toString("base64url")}!`;
  const adminRoute = (env.ADMIN_ROUTE || "manage-store").replace(/^\/+|\/+$/g, "");

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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
    console.error(
      "Could not upsert roles. Apply migrations first.",
      rolesError.message,
    );
    process.exit(1);
  }

  let userId = null;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: "Store", last_name: "Admin" },
  });

  if (created.error) {
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = listed.data?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );
    if (!existing) {
      console.error("Failed to create user:", created.error.message);
      process.exit(1);
    }
    userId = existing.id;
    const updated = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updated.error) {
      console.error(
        "Failed to reset existing admin password:",
        updated.error.message,
      );
      process.exit(1);
    }
  } else {
    userId = created.data.user.id;
  }

  const { error: adminUserError } = await admin.from("admin_users").upsert(
    { user_id: userId, store_id: null, is_active: true },
    { onConflict: "user_id" },
  );
  if (adminUserError) {
    console.error("admin_users upsert failed:", adminUserError.message);
    process.exit(1);
  }

  const { data: roleRow, error: roleLookupError } = await admin
    .from("roles")
    .select("id")
    .eq("code", "SUPER_ADMIN")
    .maybeSingle();
  if (roleLookupError || !roleRow) {
    console.error("SUPER_ADMIN role missing. Apply seed/migrations.");
    process.exit(1);
  }

  const { error: linkError } = await admin.from("admin_user_roles").upsert(
    { user_id: userId, role_id: roleRow.id },
    { onConflict: "user_id,role_id" },
  );
  if (linkError) {
    const { error: insertError } = await admin.from("admin_user_roles").insert({
      user_id: userId,
      role_id: roleRow.id,
    });
    if (insertError && !/duplicate|unique/i.test(insertError.message)) {
      console.error("admin_user_roles link failed:", insertError.message);
      process.exit(1);
    }
  }

  console.log("");
  console.log("First admin ready (change password after login).");
  console.log(`URL:      /${adminRoute}/login`);
  console.log(`Email:    ${email}`);
  if (!env.ADMIN_PASSWORD?.trim()) {
    console.log(`Password: ${password}`);
  } else {
    console.log("Password: (from ADMIN_PASSWORD)");
  }
  console.log("");
  console.log(
    "This script is intentional bootstrap only — customers cannot self-promote to admin.",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
