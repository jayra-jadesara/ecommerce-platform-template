"use server";

import {
  startStaffViewSession,
  type StaffViewSessionResult,
} from "@/features/auth/staff-view-session";

export type ImpersonationActionResult = StaffViewSessionResult;

/**
 * Server action — sets overlay only (no redirect).
 * Prefer linking to /view-as/[userId] in a new tab from Team.
 */
export async function startImpersonationAction(
  targetUserId: string,
): Promise<ImpersonationActionResult> {
  return startStaffViewSession(targetUserId);
}

/** @deprecated Prefer startStaffViewSession / /view-as route. */
export async function startImpersonationSession(
  targetUserId: string,
): Promise<ImpersonationActionResult> {
  return startStaffViewSession(targetUserId);
}

export {
  stopImpersonationAction,
  stopImpersonationAndRefreshAction,
} from "@/features/auth/stop-impersonation-actions";
