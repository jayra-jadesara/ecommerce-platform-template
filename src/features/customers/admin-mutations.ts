import "server-only";

import { randomBytes } from "node:crypto";
import { getAdminPath } from "@/config/admin-route";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { unexpectedFailure } from "@/features/error-monitoring/unexpected";
import { getCurrentAdmin, hasPermission } from "@/features/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CUSTOMERS_ROUTE = getAdminPath("/customers");

export type CustomerActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  temporaryPassword?: string;
  blockedReason?: string;
};

function generateTemporaryPassword(): string {
  const alphabet =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
  const bytes = randomBytes(14);
  let out = "";
  for (const byte of bytes) {
    out += alphabet[byte % alphabet.length]!;
  }
  return out;
}

async function requireCustomerActor(permission: "customers.password" | "customers.delete") {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin, permission)) {
    return {
      ok: false as const,
      error: "You do not have permission for this customer action.",
    };
  }
  return { ok: true as const, admin };
}

/** True when this auth user also has an admin/staff row (used in admin UI). */
export async function isCustomerAdminStaff(userId: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data?.user_id);
}

export async function setCustomerPassword(input: {
  userId: string;
  password?: string | null;
  generate?: boolean;
}): Promise<CustomerActionResult> {
  const gate = await requireCustomerActor("customers.password");
  if (!gate.ok) return gate;
  const { admin } = gate;

  const userId = input.userId?.trim();
  if (!userId) return { ok: false, error: "Customer not found." };

  if (userId === admin.user.id) {
    return {
      ok: false,
      error: "Use Change Password in your profile menu for your own account.",
    };
  }

  let password = input.password?.trim() || "";
  if (input.generate || !password) {
    password = generateTemporaryPassword();
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password.length > 72) {
    return { ok: false, error: "Password is too long." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      ok: false,
      error: "Password changes are not configured (missing service role key).",
    };
  }

  const service = createSupabaseServiceClient();
  const { data: existing, error: lookupError } =
    await service.auth.admin.getUserById(userId);
  if (lookupError || !existing.user) {
    return { ok: false, error: "Customer login was not found." };
  }

  const { error: updateError } = await service.auth.admin.updateUserById(
    userId,
    { password },
  );
  if (updateError) {
    return unexpectedFailure({
      type: "SERVER",
      source: "SERVER",
      operation: "CUSTOMER_SET_PASSWORD",
      feature: "USERS",
      message: "Unable to update customer password",
      error: updateError,
      route: CUSTOMERS_ROUTE,
    });
  }

  const storeId = await resolveActiveStoreId();
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "CUSTOMER_PASSWORD_SET",
    entity_type: "auth.users",
    entity_id: userId,
    metadata: { generated: Boolean(input.generate || !input.password) },
  });

  return {
    ok: true,
    message:
      "Password updated. Copy it now — it will not be shown again after you leave this page.",
    temporaryPassword: password,
  };
}

export async function deleteStoreCustomer(input: {
  userId: string;
}): Promise<CustomerActionResult> {
  const gate = await requireCustomerActor("customers.delete");
  if (!gate.ok) return gate;
  const { admin } = gate;

  const userId = input.userId?.trim();
  if (!userId) return { ok: false, error: "Customer not found." };

  if (userId === admin.user.id) {
    return { ok: false, error: "You cannot delete your own account here." };
  }

  if (await isCustomerAdminStaff(userId)) {
    return {
      ok: false,
      error:
        "This login is used in admin (Team & roles). Remove their staff access first, or keep the account.",
      blockedReason: "admin_staff",
    };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      ok: false,
      error: "Customer delete is not configured (missing service role key).",
    };
  }

  const service = createSupabaseServiceClient();
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) {
    return unexpectedFailure({
      type: "SERVER",
      source: "SERVER",
      operation: "CUSTOMER_DELETE",
      feature: "USERS",
      message: "Unable to delete customer",
      error,
      route: CUSTOMERS_ROUTE,
    });
  }

  const storeId = await resolveActiveStoreId();
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_logs").insert({
    store_id: storeId,
    user_id: admin.user.id,
    action: "CUSTOMER_DELETED",
    entity_type: "auth.users",
    entity_id: userId,
    metadata: {},
  });

  return { ok: true, message: "Customer account deleted." };
}

export async function getCustomerSessionMaxHours(
  storeId: string | null | undefined,
): Promise<number | null> {
  if (!storeId) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("store_settings")
    .select("customer_session_max_hours")
    .eq("store_id", storeId)
    .maybeSingle();
  const hours = data?.customer_session_max_hours;
  if (hours == null) return null;
  const n = Number(hours);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

export async function updateCustomerSessionMaxHours(input: {
  hours: number | null | "never";
}): Promise<CustomerActionResult> {
  const admin = await getCurrentAdmin();
  if (
    !admin ||
    !(
      hasPermission(admin, "customers.password") ||
      hasPermission(admin, "settings.update")
    )
  ) {
    return {
      ok: false,
      error: "You do not have permission to change customer login duration.",
    };
  }

  let hours: number | null = null;
  if (input.hours !== null && input.hours !== "never") {
    const n = Math.floor(Number(input.hours));
    if (!Number.isFinite(n) || n < 1 || n > 8760) {
      return { ok: false, error: "Choose a valid duration, or Never." };
    }
    hours = n;
  }

  const supabase = await createSupabaseServerClient();
  const storeId = await resolveActiveStoreId(supabase);
  if (!storeId) return { ok: false, error: "No active store found." };

  const { error } = await supabase
    .from("store_settings")
    .update({ customer_session_max_hours: hours })
    .eq("store_id", storeId);

  if (error) {
    return unexpectedFailure({
      type: "DATABASE",
      source: "DATABASE",
      operation: "CUSTOMER_SESSION_MAX_UPDATE",
      feature: "USERS",
      message: "Unable to save customer login duration",
      error,
      databaseCode: error.code,
      storeId,
      route: CUSTOMERS_ROUTE,
    });
  }

  return {
    ok: true,
    message:
      hours == null
        ? "Customer login duration set to Never (JWT only)."
        : `Customer login duration set to ${hours} hour${hours === 1 ? "" : "s"}.`,
  };
}
