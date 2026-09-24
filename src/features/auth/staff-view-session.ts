import "server-only";

import { createStaffViewToken, clearImpersonationCookie } from "@/features/auth/impersonation";
import {
  getActorAdmin,
  hasPermission,
  hasRole,
} from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffViewSessionResult =
  | { ok: true; token: string; message?: string }
  | { ok: false; error: string };

/**
 * Start viewing the admin UI as another active staff member.
 * Returns a signed URL token — does NOT set a shared cookie, so the Super Admin
 * tab stays Super Admin when View as opens in a new tab.
 */
export async function startStaffViewSession(
  targetUserId: string,
): Promise<StaffViewSessionResult> {
  const actor = await getActorAdmin();
  if (
    !actor ||
    !hasPermission(actor, "users.manage") ||
    !hasRole(actor, "SUPER_ADMIN")
  ) {
    return { ok: false, error: "Only Super Admin can open admin as staff." };
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
    // Drop any legacy shared cookie so other tabs keep Super Admin.
    await clearImpersonationCookie();
    const token = createStaffViewToken({
      actorUserId: actor.user.id,
      targetUserId,
    });
    return { ok: true, token, message: "Staff view started." };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Unable to start staff view session.";
    return { ok: false, error: message };
  }
}
