"use server";

import { getAdminPath } from "@/config/admin-route";
import type { CleanupActionId } from "@/features/platform-usage/cleanup/types";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";

const HOSTING_ROUTE = getAdminPath("/platform-usage");

async function cleanupService() {
  return import("@/features/platform-usage/cleanup/execute");
}

async function previewService() {
  return import("@/features/platform-usage/cleanup/preview");
}

export async function previewCleanupAction(action: CleanupActionId) {
  const { getCurrentAdmin } = await import("@/features/auth/session");
  const { hasAnyRole } = await import("@/features/auth/permissions");
  const admin = await getCurrentAdmin();
  if (!admin || !hasAnyRole(admin.roles, ["SUPER_ADMIN"])) {
    return {
      ok: false as const,
      error: "Only a Super Admin can preview storage cleanup.",
    };
  }

  try {
    const { previewCleanup } = await previewService();
    const preview = await previewCleanup(action);
    return { ok: true as const, preview };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Preview failed.",
    };
  }
}

export async function executeCleanupAction(input: {
  action: CleanupActionId;
  confirmPhrase: string;
}) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: `CLEANUP_${input.action.toUpperCase()}`,
      feature: "PLATFORM",
      route: HOSTING_ROUTE,
    },
    async () => {
      const { executeCleanup } = await cleanupService();
      return executeCleanup(input);
    },
  );
}
