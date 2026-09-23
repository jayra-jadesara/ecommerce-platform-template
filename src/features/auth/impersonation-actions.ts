"use server";

import { redirect } from "next/navigation";
import { getAdminPath } from "@/config/admin-route";
import {
  clearImpersonationCookie,
  readImpersonationCookie,
  setImpersonationCookie,
} from "@/features/auth/impersonation";
import {
  getActorAdmin,
  hasPermission,
  hasRole,
} from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ImpersonationActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/**
 * Start viewing the admin UI as another active staff member.
 * Keeps Super Admin Auth session; sets overlay cookie only.
 */
export async function startImpersonationAction(
  targetUserId: string,
): Promise<ImpersonationActionResult> {
  const actor = await getActorAdmin();
  if (
    !actor ||
    !hasPermission(actor, "users.manage") ||
    !hasRole(actor, "SUPER_ADMIN")
  ) {
    return { ok: false, error: "Only Super Admin can open admin as staff." };
  }

  const existing = await readImpersonationCookie();
  if (existing) {
    return { ok: false, error: "Exit the current staff view first." };
  }
  if (targetUserId === actor.user.id) {
    return { ok: false, error: "You are already signed in as yourself." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: target } = await supabase
    .from("admin_users")
    .select("user_id, is_active")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!target) {
    return { ok: false, error: "Team member not found." };
  }
  if (!target.is_active) {
    return {
      ok: false,
      error: "That person has admin access blocked. Turn it on first.",
    };
  }

  const { data: roleLinks } = await supabase
    .from("admin_user_roles")
    .select("role_id")
    .eq("user_id", targetUserId);
  if (!roleLinks?.length) {
    return { ok: false, error: "That person has no admin role assigned." };
  }

  try {
    await setImpersonationCookie({
      actorUserId: actor.user.id,
      targetUserId,
    });
  } catch {
    return { ok: false, error: "Unable to start staff view session." };
  }

  redirect(getAdminPath("/dashboard"));
}

/**
 * Clear overlay only — Super Admin Auth session stays signed in.
 */
export async function stopImpersonationAction(): Promise<ImpersonationActionResult> {
  await clearImpersonationCookie();
  return { ok: true, message: "Back to your Super Admin session." };
}

export async function stopImpersonationAndRefreshAction(): Promise<void> {
  await clearImpersonationCookie();
  redirect(getAdminPath("/team"));
}
