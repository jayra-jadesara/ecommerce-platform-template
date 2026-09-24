"use server";

import { redirect } from "next/navigation";
import { getAdminPath } from "@/config/admin-route";
import { clearImpersonationCookie } from "@/features/auth/impersonation";

export type StopImpersonationResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/**
 * Exit staff view — clear any legacy cookie. URL token drops when navigating
 * to a normal admin path (no `/as/{token}/` prefix).
 */
export async function stopImpersonationAction(): Promise<StopImpersonationResult> {
  await clearImpersonationCookie();
  return { ok: true, message: "Back to your Super Admin session." };
}

export async function stopImpersonationAndRefreshAction(): Promise<void> {
  await clearImpersonationCookie();
  redirect(getAdminPath("/team", { staffViewToken: null }));
}
