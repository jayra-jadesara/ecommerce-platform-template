/**
 * One-shot local bootstrap: create default SUPER_ADMIN in Supabase Auth + RBAC tables.
 * Usage: node scripts/create-default-admin.mjs
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    throw new Error("Missing .env.local");
  }
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalizeUrl(raw) {
  let url = (raw || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    if (/^[a-z0-9-]+$/i.test(url)) url = `https://${url}.supabase.co`;
    else if (/^[a-z0-9-]+\.supabase\.co$/i.test(url)) url = `https://${url}`;
  }
  return url.replace(/\/$/, "");
}

async function main() {
  const env = loadEnvLocal();
  const url = normalizeUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !url.includes("supabase.co")) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL must be https://YOUR_REF.supabase.co",
    );
    process.exit(1);
  }
  if (!serviceKey) {
    console.error(
      "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Settings → API → Secret key).",
    );
    process.exit(1);
  }

  const email = "admin@example.com";
  const password = `Admin-${randomBytes(6).toString("base64url")}!`;

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ensure roles exist
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

  // Create or find auth user
  let userId = null;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: "Store", last_name: "Admin" },
  });

  if (created.error) {
    // If already exists, list and update password
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
      console.error("Failed to reset existing admin password:", updated.error.message);
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
    // Some schemas use no composite unique — try insert ignore style
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
  console.log("Default admin ready.");
  console.log("URL:      /manage-store/login");
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log("");
  console.log("Change this password after first login.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
